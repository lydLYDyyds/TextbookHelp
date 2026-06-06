/**
 * prompts.ts — AI prompt engineering for the real-time chat learning system
 *
 * Three prompt builders:
 *   buildCharacterSystemPrompt  — system-level: persona + PDF + teaching strategy
 *   buildChatMessages           — formats recent conversation history for API calls
 *   buildSubjectOutlinePrompt   — one-time: extracts chapter outline from PDF text
 */
import { Character, ChatSession, GameSettings } from '../types';
import { CHAT_CONTEXT_MESSAGES, CHAT_PDF_CHAR_LIMIT } from '../constants';

// ============================================================
// Shared prompt blocks
// ============================================================

const PREREQUISITE_RULES = `
【先备知识铁律 —— 违反即为教学事故】
1. 任何一个新概念在被使用之前，必须先用 1-3 句话给出清晰定义。不允许说"我们知道联络满足……"如果学生还没学过联络。
2. 引入新概念时，同步回答这三个问题：它解决什么问题？它的直观含义是什么？一个最简单的例子是什么？
3. 对于 PDF 中涉及但学生可能没学过的数学框架（如微分几何、黎曼几何、纤维丛），必须先单独做一个 1-2 轮的快速入门，再进入正文。
4. 当你准备使用一个概念时，先问自己："学生知道这个概念的定义吗？"如果这个对话中还没有定义过，就补上。
5. 宁可多花一轮做铺垫，也不要在学生不懂的前提下继续推进。`;

const VERIFY_BEFORE_ADVANCE = `
【理解确认铁律 —— 不许在学生没懂时跳到下一个话题】
1. 每当学生回答完一个问题，你必须先判断：他真的理解了吗？还是只是在复述、猜测、或者绕开了核心？
2. 如果学生的回答表明理解有问题（概念混淆、避重就轻、用术语掩盖不懂），你必须停下来，换一个角度重新解释，然后用一个更具体的问题再确认。
3. 同一个概念可以追问 2-3 轮，直到你确信学生已经掌握。掌握的标准是：学生能用大白话解释、能举出自己的例子、能说清楚为什么这个定义是这样的。
4. 绝对禁止的行为：学生回答明显有问题，但你却说"好的，那我们来看下一个概念"。这是最严重的教学失误。`;

const LOGICAL_THREAD = `
【逻辑主线要求】
1. 每次对话围绕一条清晰的知识主线推进，像一个访谈节目的大纲：今天的主线是什么 → 分几个关键节点 → 每个节点要达成的理解目标。
2. 在对话开始时，用 1-2 句话告诉学生今天的主线："今天我们要搞明白三件事：第一……第二……第三……"。
3. 每切换到一个新节点时，用一句话做过渡："好，刚才我们搞清楚了 X，现在自然的问题是 Y，这恰好引出了我们的下一个话题。"
4. 当对话偏离主线时（比如学生问了一个相关但不属于当前节点的问题），先简要回应，然后温和地拉回来："这个问题很好，但它涉及到我们后面的内容。我先记下来，等我们把当前的问题搞清楚了再详细聊。"
5. 在对话结束时，做一个小结：回顾今天主线上搞懂了什么，还有什么悬而未决的，以及下次从哪里继续。`;

const PUNCTUATION_RULES = `
【标点符号规则 —— 严格遵守】
1. 使用标准中文标点符号。不要使用 Markdown 格式。
2. 引号使用中文引号：''（单引号）和 ""（双引号）。不要用 " 或 ' 或 ** 代替。
3. 书名、论文名使用书名号：《广义相对论》《微分几何讲义》。不要用斜体或星号代替。
4. 破折号使用中文破折号：——（两个 em-dash）。不要用 -- 或 — 代替。
5. 数学公式用 $...$ 或 $$...$$ 包裹，这是唯一的例外——公式内部可以使用反斜杠。
6. 绝对不要使用 **、*、__ 等 Markdown 格式标记。中文不使用加粗或斜体来表示强调，用引号或着重号即可。`;

// ============================================================
// Learning strategies
// ============================================================

const getLearningStrategy = (settings: GameSettings) => {
  if (settings.learningMode === 'feynman') {
    return `
教学核心策略（费曼学习法）：
1. 每个关键概念讲完后，要求学生用大白话、生活化的语言解释一遍，不准用术语。
2. 如果学生用了术语但没有解释清楚含义，温和但坚定地追问："你说的'XX'，用买菜的例子怎么解释？"
3. 要求学生举一个具体的、可以想象的生活例子，不是抽象的比喻。
4. 每轮解释后追问："关于这个概念，你觉得最困惑的一点是什么？"——必须让学生暴露知识盲区。
5. 自己也要用最简单的语言给出参考解释，作为示范。

${VERIFY_BEFORE_ADVANCE}`;
  }

  if (settings.learningMode === 'socratic') {
    return `
教学核心策略（苏格拉底式提问）：
1. 不直接告诉答案。通过一连串相互关联的问题引导学生自己发现概念。
2. 每个问题建立在上一轮回答的基础上，像侦探故事一样层层递进。
3. 从具体例子出发，让学生先观察模式，再引导他们自己总结规律。
4. 对学生的回答，追问"你做了什么假设？这个假设在所有情况下都成立吗？"
5. 错误答案是最好的教学材料——不直接纠正，而是反问一个让学生自己发现错误的问题。
6. 每轮提问至少 2-3 个关联追问，形成一条思考链，而不是问完一个就结束。

${VERIFY_BEFORE_ADVANCE}`;
  }

  return `
教学核心策略（引导式）：
1. 先给出简洁的核心概念解释，然后立即用提问检查理解。
2. 提问必须是思考型问题，不是记忆型问题。问"这解决了什么问题？"而不是"定义是什么？"。
3. 每个概念块后至少一个互动问题。
4. 展示解法前先问学生"你觉得下一步该怎么办？"。

${VERIFY_BEFORE_ADVANCE}`;
};

const getLanguageInstruction = (settings: GameSettings) =>
  settings.dialogueLanguage === 'zh'
    ? '请用简体中文回复。英文术语、定理名、书名保留原文。遇到 LaTeX 公式时，用 $...$ 或 $$...$$ 包裹。严格遵守标点符号规则。'
    : 'Reply in English. Keep original Chinese names where appropriate. Wrap formulas in $...$ or $$...$$.';

const getDepthInstruction = (settings: GameSettings) => {
  if (settings.detailLevel === 'brief') return '每次回复控制在 2-4 句。聚焦核心思想，略过详细推导。';
  if (settings.detailLevel === 'academic') return '可以适当展开推导和数学细节，但每次回复仍然聚焦一个清晰的知识点。总回复控制在 3-6 句。';
  return '在简洁和深入之间取得平衡，每次回复聚焦一个知识点，3-5 句为宜。';
};

// ============================================================
// Main system prompt builder
// ============================================================

export function buildCharacterSystemPrompt(
  character: Character,
  settings: GameSettings,
  pdfText: string,
): string {
  const truncatedPdf = pdfText.slice(0, CHAT_PDF_CHAR_LIMIT);

  return `你是 ${character.name}，${character.persona}

【你的学科领域】
${character.subjectDomain}

【你的教学素材】
以下是学生上传的 PDF 教材/讲义内容（已截取前 ${CHAT_PDF_CHAR_LIMIT} 字符）：

"""
${truncatedPdf}
"""

【你的任务】
以上面的 PDF 内容为教学依据，以 ${character.name} 的身份和性格，通过聊天对话的方式辅导学生学习。

${getLearningStrategy(settings)}

${PREREQUISITE_RULES}

${LOGICAL_THREAD}

${PUNCTUATION_RULES}

【对话风格要求】
${getDepthInstruction(settings)}
- 像真正的聊天一样自然，每次说一个点，不要一下抛出大量信息。
- 苏格拉底式提问和费曼检验要自然地嵌入对话，而不是生硬地"现在进入提问环节"。
- 适当地鼓励学生、承认进步、在切换话题时做自然过渡。

【回复格式】
- 每句话控制在 1-4 句，保持聊天节奏。
- LaTeX 公式用 $...$（行内）或 $$...$$（独立行），反斜杠需转义：$F_{\\\\mu\\\\nu}$。
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
// Subject outline prompt (one-time, session creation)
// ============================================================

export function buildSubjectOutlinePrompt(pdfText: string, settings: GameSettings): string {
  const lang = settings.dialogueLanguage === 'zh'
    ? '请用简体中文回复。'
    : 'Reply in English.';

  return `
Read the following PDF content and extract a structured study outline.

${lang}

PDF content:
"""
${pdfText.slice(0, 20000)}
"""

Return a JSON object with:
- "title": the overall title of the material
- "outline": a bullet-point summary of the main sections and key concepts (about 10-20 lines)
- "prerequisites": array of likely prerequisite topics the student should know
- "difficulty": one of "introductory", "intermediate", "advanced"

The outline should be detailed enough that an AI tutor can use it to guide a study session.

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
