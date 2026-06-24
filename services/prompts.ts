/**
 * prompts.ts — AI prompt engineering for the diagnostic teaching engine
 *
 * v2 architecture: each AI turn produces <diagnosis> + <response>.
 * Diagnosis drives the student model; response is what the user sees.
 */
import { Character, ChatSession, GameSettings, StudentModel, EMPTY_STUDENT_MODEL } from '../types';
import { CHAT_CONTEXT_MESSAGES, CHAT_PDF_CHAR_LIMIT } from '../constants';

// ============================================================
// Student model formatting (injected into system prompt)
// ============================================================

function formatStudentModel(model: StudentModel): string {
  if (!model.updatedAt) {
    return '该学生刚开始学习，还没有积累的学习数据。请从第一轮对话中逐步了解学生的水平。';
  }

  const concepts = Object.entries(model.conceptMastery);
  const conceptLines = concepts.length > 0
    ? concepts
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, score]) => `  - ${name}: ${score}%`)
        .join('\n')
    : '  （尚无记录）';

  const weakLines = model.weakAreas.length > 0
    ? model.weakAreas.map(a => `  - ${a}`).join('\n')
    : '  （尚无记录）';

  const mistakeLines = model.commonMistakes.length > 0
    ? model.commonMistakes.slice(0, 5).map(m => `  - ${m}`).join('\n')
    : '  （尚无记录）';

  const recentDiags = model.recentDiagnoses.slice(-5);
  const diagSummary = recentDiags.length > 0
    ? recentDiags.map(d => `  [${d.understanding}] ${d.conceptInvolved}: ${d.gap}`).join('\n')
    : '  （尚无记录）';

  return `已知概念与掌握度：
${conceptLines}

薄弱区域：
${weakLines}

常见错误模式：
${mistakeLines}

最近诊断记录（最近 5 条）：
${diagSummary}

学习风格特征：${model.learningStyle || '尚未识别'}`;
}

// ============================================================
// Internal thinking protocol
// ============================================================

const DIAGNOSIS_PROTOCOL = `
【内部思考协议 —— 每轮回复前必须执行】

在生成任何用户可见的回复之前，你必须在 <diagnosis>...</diagnosis> 中完成一次内部分析。

严格格式：
<diagnosis>
understanding: solid|partial|confused|guessing
gap: 一句话描述学生暴露的知识空白或混淆点（如果理解良好则写"无明显gap"）
action: deepen|re_explain|advance|test
concept: 当前涉及的核心概念名
</diagnosis>

诊断填写指南：
- understanding：评估学生上一轮回答展现的理解水平
  - solid：回答正确且展示出深层理解
  - partial：方向对但有遗漏、混淆或不够精确
  - confused：有明显误解或完全不懂
  - guessing：在猜测、回避问题或用术语掩盖不理解
- gap：具体写了什么错误或遗漏了什么（这是最重要的字段，决定后续教学方向）
- action：基于诊断决定的教学行为
  - deepen：学生懂了，追问更深层的问题
  - re_explain：学生没懂或部分懂，换角度重新解释
  - advance：多次确认掌握后，推进到下一个概念
  - test：用具体例子或反例检验理解
- concept：当前讨论的核心概念名称（如"联络"、"曲率张量"、"规范变换"）

教学决策铁律（违反即为教学事故）：
1. 如果 understanding=partial 或 confused，必须 action=re_explain，不许跳话题
2. 如果同一个概念前两轮也是 partial/confused，绝不能再解释第三遍——必须降级到更基础的概念
3. 如果 understanding=guessing，必须 action=test，用一个具体例子让他们暴露真实水平
4. 只有连续 2 轮 solid 且概念已覆盖充分，才能 action=advance

然后，在 <response>...</response> 中给出你的可见回复。回复要自然、符合你的角色人设。
`;

// ============================================================
// Learning strategies
// ============================================================

const getLearningStrategy = (settings: GameSettings) => {
  const VERIFY = `
理解确认铁律：
1. 学生的回答有问题时，必须停下来，换角度重新解释，然后追问确认。
2. 同一个概念可以追问 2-3 轮。只有学生能用大白话解释、能举出自己的例子，才算掌握。
3. 禁止在学生明显不懂时说"好的我们看下一个"。`;

  if (settings.learningMode === 'feynman') {
    return `教学核心策略（费曼学习法）：
1. 每个关键概念讲完后，要求学生用大白话、生活化的语言解释，不准用术语。
2. 如果学生用了术语但没解释清楚，温和追问："用买菜的例子怎么解释？"
3. 每轮解释后追问："关于这个概念，你觉得最困惑的一点是什么？"
${VERIFY}`;
  }
  if (settings.learningMode === 'socratic') {
    return `教学核心策略（苏格拉底式提问）：
1. 不直接告诉答案，通过一连串相互关联的问题引导学生自己发现概念。
2. 每个问题建立在上轮回答基础上，像侦探故事一样层层递进。
3. 错误答案是最好的材料——不直接纠正，反问一个让学生自己发现错误的问题。
${VERIFY}`;
  }
  return `教学核心策略（引导式）：
1. 先给简洁的核心概念解释，然后立即用提问检查理解。
2. 提问必须是思考型问题，不是记忆型问题。
${VERIFY}`;
};

const PREREQUISITE_RULES = `
先备知识铁律：
1. 任何新概念在被使用之前，必须先给清晰定义。
2. 引入新概念时同步回答：它解决什么问题？直观含义？最简单的例子？
3. 涉及学生可能没学过的框架（如微分几何、纤维丛），必须先做快速入门。
4. 使用概念前问自己："学生知道这个吗？"如果对话中还没定义过，就补上。`;

const LOGICAL_THREAD = `
逻辑主线要求：
1. 对话开始时用 1-2 句讲清楚今天的主线。
2. 切换节点时做过渡："刚才搞清楚了 X，自然的问题是 Y。"
3. 结尾做小结：今天搞懂了什么、悬而未决的是什么、下次从哪里继续。`;

const PUNCTUATION_RULES = `
标点规则：使用标准中文标点。「」双引号，《》书名号，——破折号。禁止 Markdown 的 **、* 格式。数学公式用 $...$ 或 $$...$$。`;

const getLanguageInstruction = (settings: GameSettings) =>
  settings.dialogueLanguage === 'zh'
    ? '请用简体中文回复。'
    : 'Reply in English.';

const getDepthInstruction = (settings: GameSettings) => {
  if (settings.detailLevel === 'brief') return '每次回复控制在 2-4 句。';
  if (settings.detailLevel === 'academic') return '可以适当展开推导，每次回复聚焦一个知识点，3-6 句。';
  return '每次回复聚焦一个知识点，3-5 句。';
};

// ============================================================
// Main system prompt builder
// ============================================================

export function buildCharacterSystemPrompt(
  character: Character,
  settings: GameSettings,
  pdfText: string | undefined,
  studentModel?: StudentModel,
): string {
  const model = studentModel && studentModel.updatedAt > 0
    ? studentModel
    : EMPTY_STUDENT_MODEL;

  const pdfBlock = pdfText
    ? `【教学素材（仅供参考）】\n以下是学生上传的 PDF 教材内容（截取 ${CHAT_PDF_CHAR_LIMIT} 字符）。这是你的教学参考，但你必须优先根据学生的实际理解水平——而非 PDF 的章节顺序——来决定教学内容。如果学生在某个概念上卡住了，停下来深挖，不要因为 PDF 后面还有内容就急着推进。\n\n"""\n${pdfText.slice(0, CHAT_PDF_CHAR_LIMIT)}\n"""`
    : `【教学素材】\n该学生未上传 PDF 教材。请基于你在「${character.subjectDomain}」领域的知识自由教学。先通过对话了解学生的水平，确定一个合适的起点，然后按你的教学判断推进。`;

  return `你是 ${character.name}，${character.persona}

【你的学科领域】
${character.subjectDomain}

【学生画像】（来自之前的对话分析，持续更新中）
${formatStudentModel(model)}

${pdfBlock}

【你的任务】
以 ${character.name} 的身份和性格，通过聊天对话辅导学生学习。你的教学目标是什么由你根据学生画像和对话进展来决定——不是在复述教材，而是在引导一个活生生的人理解复杂概念。

${DIAGNOSIS_PROTOCOL}

${getLearningStrategy(settings)}

${PREREQUISITE_RULES}

${LOGICAL_THREAD}

${PUNCTUATION_RULES}

【对话风格】
${getDepthInstruction(settings)}
- 像真正的聊天一样自然，每次说一个点。
- 苏格拉底提问和费曼检验自然嵌入对话。
- 适当鼓励学生，在切换话题时做自然过渡。
- LaTeX 公式用 $...$ 或 $$...$$，反斜杠需转义：$F_{\\\\mu\\\\nu}$。
- ${getLanguageInstruction(settings)}`;
}

// ============================================================
// Chat message formatter
// ============================================================

export function buildChatMessages(
  session: ChatSession,
  newUserMessage: string,
): Array<{ role: string; text: string }> {
  const recentMessages = session.messages.slice(-CHAT_CONTEXT_MESSAGES);
  const result: Array<{ role: string; text: string }> = [];

  for (const msg of recentMessages) {
    result.push({ role: msg.role === 'user' ? 'user' : 'assistant', text: msg.text });
  }

  result.push({ role: 'user', text: newUserMessage });
  return result;
}

// ============================================================
// Subject outline prompt
// ============================================================

export function buildSubjectOutlinePrompt(pdfText: string, settings: GameSettings): string {
  const lang = settings.dialogueLanguage === 'zh' ? '请用简体中文回复。' : 'Reply in English.';

  return `
Read the following PDF content and extract a structured study outline.

${lang}

PDF content:
"""
${pdfText.slice(0, 20000)}
"""

Return JSON with:
- "title": overall title
- "outline": bullet summary of main sections (10-20 lines)
- "prerequisites": array of likely prerequisite topics
- "difficulty": "introductory" | "intermediate" | "advanced"

Return ONLY valid JSON.
`;
}

export const subjectOutlineSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    outline: { type: 'STRING' },
    prerequisites: { type: 'ARRAY', items: { type: 'STRING' } },
    difficulty: { type: 'STRING', enum: ['introductory', 'intermediate', 'advanced'] },
  },
  required: ['title', 'outline', 'prerequisites', 'difficulty'],
};
