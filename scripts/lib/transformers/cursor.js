import { transformProvider } from './shared.js';

/**
 * Cursor Transformer
 * Output: .cursor/skills/{name}/SKILL.md
 */
export function transformCursor(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'cursor',
    displayName: 'Cursor',
    configDir: '.cursor',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.license) obj.license = skill.license;
      return obj;
    },
  }, skills, distDir, options);
}
