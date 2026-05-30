// generate-ai-guide.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname);

console.log('🚀 Генерация AI-GUIDE для lightweight-charts-ui...\n');

const config = {
  maxFileSize: 12000,
  maxTotalSize: 850000,
  includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.md', '.css', '.json'],
  ignoreDirs: ['node_modules', 'dist', '.git', 'coverage', 'public', 'build', 'tmp'],
  ignoreFiles: ['.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
  
  modes: {
    full: {
      name: 'full',
      description: 'Полная версия — все файлы',
      priorityDirs: ['src/']
    },
    core: {
      name: 'core',
      description: 'Только основное: Chart + Layout + Toolbar + Hooks',
      priorityDirs: [
        'src/components/Chart',
        'src/components/Layout',
        'src/components/Toolbar',
        'src/components/Topbar',
        'src/hooks',
        'src/store',
        'src/App.jsx',
        'src/main.jsx'
      ],
      includeDirs: ['src/components/Chart', 'src/components/Layout', 'src/hooks', 'src/store']
    },
    trading: {
      name: 'trading',
      description: 'Торговый функционал (без Replay, Indicators и т.д.)',
      priorityDirs: [
        'src/components/Chart',
        'src/components/Toolbar',
        'src/components/Topbar',
        'src/hooks',
        'src/store'
      ],
      excludeDirs: ['src/components/Replay', 'src/utils/indicators', 'src/components/Alerts']
    }
  }
};

// ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======================

function getRelativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
}

function buildProjectTree(dir = PROJECT_ROOT, prefix = '') {
  let tree = '';
  const items = fs.readdirSync(dir)
    .filter(item => !config.ignoreDirs.includes(item));

  items.sort((a, b) => {
    const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
    const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
    if (aIsDir !== bIsDir) return bIsDir - aIsDir;
    return a.localeCompare(b);
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const fullPath = path.join(dir, item);
    const isDir = fs.statSync(fullPath).isDirectory();

    tree += `${prefix}${isLast ? '└── ' : '├── '}${item}\n`;

    if (isDir) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      tree += buildProjectTree(fullPath, newPrefix);
    }
  }
  return tree;
}

function shouldIncludeFile(filePath, modeConfig) {
  const rel = getRelativePath(filePath);
  
  if (modeConfig.excludeDirs) {
    if (modeConfig.excludeDirs.some(dir => rel.startsWith(dir))) return false;
  }
  
  if (modeConfig.includeDirs) {
    return modeConfig.includeDirs.some(dir => rel.startsWith(dir));
  }
  
  return true;
}

// ====================== ОСНОВНАЯ ФУНКЦИЯ ======================

function generateAIGuide(modeName = 'full') {
  const mode = config.modes[modeName] || config.modes.full;

  let allFiles = [];
  function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!config.ignoreDirs.includes(item)) {
          scan(fullPath);
        }
      } else {
        const ext = path.extname(item);
        if (config.includeExtensions.includes(ext)) {
          if (shouldIncludeFile(fullPath, mode)) {
            allFiles.push(fullPath);
          }
        }
      }
    }
  }

  scan(PROJECT_ROOT);

  // Сортировка по приоритету
  allFiles.sort((a, b) => {
    const aRel = getRelativePath(a);
    const bRel = getRelativePath(b);
    const aPri = mode.priorityDirs.findIndex(p => aRel.startsWith(p));
    const bPri = mode.priorityDirs.findIndex(p => bRel.startsWith(p));
    if (aPri !== bPri) return aPri - bPri;
    return aRel.localeCompare(bRel);
  });

  let output = `# AI-GUIDE: lightweight-charts-ui — ${mode.description}\n\n`;
  output += `Дата: ${new Date().toISOString()}\n`;
  output += `Режим: ${modeName} | Файлов: ${allFiles.length}\n\n`;

  // Дерево проекта
  output += `## Структура проекта\n\`\`\`\n`;
  output += buildProjectTree();
  output += `\`\`\`\n\n---\n\n`;

  let totalSize = 0;

  for (const filePath of allFiles) {
    const relative = getRelativePath(filePath);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.length > config.maxFileSize) {
      content = content.slice(0, config.maxFileSize) + `\n\n... [Обрезано — файл слишком большой] ...\n`;
    }

    output += `## 📄 ${relative}\n\n`;
    output += `\`\`\`${path.extname(filePath).slice(1)}\n`;
    output += content + '\n';
    output += `\`\`\`\n\n---\n\n`;

    totalSize += content.length;
    if (totalSize > config.maxTotalSize) {
      output += `**⚠️ Достигнут лимит размера. Остальные файлы пропущены.**\n`;
      break;
    }
  }

  const filename = `AI-GUIDE-${modeName}.md`;
  fs.writeFileSync(filename, output, 'utf8');

  console.log(`✅ ${filename} успешно создан!`);
  console.log(`   Режим: ${mode.description}`);
  console.log(`   Файлов: ${allFiles.length}`);
  console.log(`   Размер: ~${(totalSize / 1024 / 1024).toFixed(1)} MB\n`);
}

// ====================== ЗАПУСК ======================

const requestedMode = process.argv[2] || 'full';
generateAIGuide(requestedMode);