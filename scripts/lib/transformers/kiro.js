import { transformProvider } from './shared.js';

/**
 * Kiro Transformer
 * Output: .kiro/skills/{name}/SKILL.md
 */
export function transformKiro(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'kiro',
    displayName: 'Kiro',
    configDir: '.kiro',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.license) obj.license = skill.license;
      if (skill.compatibility) obj.compatibility = skill.compatibility;
      if (skill.metadata) obj.metadata = skill.metadata;
      return obj;
    },
  }, skills, distDir, options);
}
