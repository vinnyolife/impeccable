import { transformProvider } from './shared.js';

/**
 * Gemini Transformer
 * Output: .gemini/skills/{name}/SKILL.md
 * User-invokable: {{arg}} placeholders become {{args}}
 */
export function transformGemini(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'gemini',
    displayName: 'Gemini',
    configDir: '.gemini',
    buildFrontmatter: (skill, skillName) => ({
      name: skillName,
      description: skill.description,
    }),
    transformBody: (body, skill) => {
      if (skill.userInvokable) {
        return body.replace(/\{\{[^}]+\}\}/g, '{{args}}');
      }
      return body;
    },
  }, skills, distDir, options);
}
