import React, { useMemo, useState } from 'react';
import { advancedResources, bridgeTracks, resourceCategories } from '../data/advancedResources';
import { StudyResource } from '../types';

interface ResourceLibraryScreenProps {
  onBack: () => void;
  onImport: () => void;
  language: 'zh' | 'en';
}

const levelLabels: Record<StudyResource['level'], string> = {
  'advanced-undergraduate': 'Advanced UG',
  graduate: 'Graduate',
  research: 'Research',
};

const typeLabels: Record<StudyResource['type'], string> = {
  course: 'Course',
  'lecture-notes': 'Notes',
  pdf: 'PDF',
  book: 'Book',
  reference: 'Reference',
};

export const ResourceLibraryScreen: React.FC<ResourceLibraryScreenProps> = ({ onBack, onImport, language }) => {
  const zh = language === 'zh';
  const [activeCategory, setActiveCategory] = useState('Roadmaps');
  const [query, setQuery] = useState('');

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return advancedResources.filter(resource => {
      const matchCategory = activeCategory === 'Roadmaps' || resource.category === activeCategory;
      const haystack = [
        resource.title,
        resource.author,
        resource.category,
        resource.summary,
        resource.bridge,
        ...resource.prerequisites,
        ...resource.tags,
      ].join(' ').toLowerCase();

      return matchCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeCategory, query]);

  return (
    <div className="h-full w-full bg-white/75 backdrop-blur-md p-4 md:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <button
              onClick={onBack}
              className="text-gal-pink-dark hover:text-gal-pink font-bold flex items-center gap-2 transition-colors mb-4"
            >
              <i className="fas fa-arrow-left"></i> {zh ? '返回' : 'Back'}
            </button>
            <h2 className="text-3xl md:text-4xl font-black text-gray-800">{zh ? '高阶数学物理资源库' : 'Advanced Math-Physics Library'}</h2>
            <p className="text-gray-500 mt-2">
              {zh ? '先选择衔接路径，打开合法资源，下载可用讲义后导入 PDF 学习。' : 'Pick a bridge path, open a legal source, download notes when available, then import the PDF for guided study.'}
            </p>
          </div>

          <button
            onClick={onImport}
            className="self-start md:self-auto px-5 py-3 rounded-lg bg-gal-blue text-white font-bold shadow hover:brightness-105 transition"
          >
            <i className="fas fa-file-import mr-2"></i>{zh ? '导入 PDF' : 'Import PDF'}
          </button>
        </div>

        <div className="bg-white border border-pink-100 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
            <div className="space-y-2">
              {resourceCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm font-bold transition
                    ${activeCategory === category
                      ? 'bg-gal-pink text-white shadow'
                      : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-gal-pink-dark'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>

            <div>
              <div className="relative mb-4">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={zh ? '搜索 qft, Lie, bundle, topology, renormalization...' : 'Search qft, Lie, bundle, topology, renormalization...'}
                  className="w-full pl-10 pr-3 py-3 rounded-lg border-2 border-gray-100 focus:border-gal-blue outline-none"
                />
              </div>

              <BridgePanel />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                {filteredResources.map(resource => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>

              {filteredResources.length === 0 && (
                <div className="text-center text-gray-500 py-16 bg-gray-50 rounded-lg">
                  No matching resources. Try geometry, gauge, representation, topology, or qft.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BridgePanel: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {bridgeTracks.map(track => (
      <div key={track.title} className="border border-blue-100 bg-blue-50 rounded-lg p-3">
        <div className="font-bold text-blue-900 mb-2">
          <i className="fas fa-route mr-2"></i>{track.title}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {track.steps.map(step => (
            <span key={step} className="px-2 py-1 rounded bg-white text-xs text-blue-800 border border-blue-100">
              {step}
            </span>
          ))}
        </div>
        <div className="text-sm text-blue-800">{track.target}</div>
      </div>
    ))}
  </div>
);

const ResourceCard: React.FC<{ resource: StudyResource }> = ({ resource }) => (
  <article className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 flex flex-col gap-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge>{resource.category}</Badge>
          <Badge>{levelLabels[resource.level]}</Badge>
          <Badge>{typeLabels[resource.type]}</Badge>
        </div>
        <h3 className="text-xl font-black text-gray-800 leading-snug">{resource.title}</h3>
        <div className="text-sm text-gray-500 mt-1">{resource.author}</div>
      </div>
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 w-10 h-10 rounded-full bg-gal-blue text-white flex items-center justify-center hover:brightness-105"
        title="Open resource"
      >
        <i className="fas fa-up-right-from-square"></i>
      </a>
    </div>

    <p className="text-gray-700 leading-relaxed">{resource.summary}</p>

    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-900">
      <div className="font-bold mb-1"><i className="fas fa-link mr-2"></i>Bridge advice</div>
      {resource.bridge}
    </div>

    <div>
      <div className="text-xs font-bold text-gray-500 mb-2">Prerequisites</div>
      <div className="flex flex-wrap gap-1.5">
        {resource.prerequisites.map(item => (
          <span key={item} className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600">{item}</span>
        ))}
      </div>
    </div>

    <div>
      <div className="text-xs font-bold text-gray-500 mb-2">Tags</div>
      <div className="flex flex-wrap gap-1.5">
        {resource.tags.map(tag => (
          <span key={tag} className="px-2 py-1 rounded bg-pink-50 text-xs text-gal-pink-dark">#{tag}</span>
        ))}
      </div>
    </div>
  </article>
);

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="px-2 py-1 rounded bg-gray-100 text-xs font-bold text-gray-600">{children}</span>
);
