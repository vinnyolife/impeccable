import { transformProvider } from './shared.js';

/**
 * Agents Transformer (VS Code Copilot + Antigravity)
 * Output: .agents/skills/{name}/SKILL.md
 */
export function transformAgents(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'agents',
    displayName: 'Agents',
    configDir: '.agents',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.userInvokable) obj['user-invokable'] = true;
      if (skill.userInvokable && skill.args && skill.args.length > 0) {
        const hints = skill.args.map(arg =>
          arg.required ? `<${arg.name}>` : `[${arg.name.toUpperCase()}=<value>]`
        );
        obj['argument-hint'] = hints.join(' ');
      }
      return obj;
    },
  }, skills, distDir, options);
}
