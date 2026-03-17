import { transformProvider } from './shared.js';

/**
 * Codex Transformer
 * Output: .codex/skills/{name}/SKILL.md
 * User-invokable: {{argname}} becomes $ARGNAME, argument-hint in frontmatter
 */
export function transformCodex(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'codex',
    displayName: 'Codex',
    configDir: '.codex',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.userInvokable && skill.args && skill.args.length > 0) {
        const hints = skill.args.map(arg =>
          arg.required ? `<${arg.name}>` : `[${arg.name.toUpperCase()}=<value>]`
        );
        obj['argument-hint'] = hints.join(' ');
      }
      if (skill.license) obj.license = skill.license;
      return obj;
    },
    transformBody: (body, skill) => {
      if (skill.userInvokable) {
        return body.replace(/\{\{([^}]+)\}\}/g, (_, argName) => `$${argName.toUpperCase()}`);
      }
      return body;
    },
  }, skills, distDir, options);
}
