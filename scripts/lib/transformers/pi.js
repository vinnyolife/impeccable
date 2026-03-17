import { transformProvider } from './shared.js';

/**
 * Pi Transformer
 * Output: .pi/skills/{name}/SKILL.md
 */
export function transformPi(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'pi',
    displayName: 'Pi',
    configDir: '.pi',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.license) obj.license = skill.license;
      if (skill.compatibility) obj.compatibility = skill.compatibility;
      if (skill.metadata) obj.metadata = skill.metadata;
      return obj;
    },
  }, skills, distDir, options);
}
