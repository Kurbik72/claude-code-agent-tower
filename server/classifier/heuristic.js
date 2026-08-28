/**
 * Offline classifier (plan 4.4).
 *
 * Always runs: it gives an instant provisional floor before DeepSeek answers,
 * and fully replaces DeepSeek when there is no key or no network.
 */

const RULES = [
  {
    floor: 'testers',
    file: [/\.(test|spec)\.[jt]sx?$/i, /(^|\/)__tests__\//i, /(^|\/)tests?\//i, /\.cy\.[jt]s$/i],
    type: [/test|spec|e2e|playwright|vitest|jest|qa-tester/i],
    tool: [/playwright/i],
    weight: 3,
  },
  {
    floor: 'qa',
    type: [/\bqa\b|review|verif|critic|audit|lint|security|simplif/i],
    tool: [/eslint|lint/i],
    file: [/\.eslintrc|biome\.json|\.golangci/i],
    weight: 3,
  },
  {
    floor: 'devops',
    file: [
      /Dockerfile/i,
      /docker-compose\.ya?ml$/i,
      /\.github\/workflows\/.*\.ya?ml$/i,
      /\.tf$/i,
      /(^|\/)k8s\//i,
      /(^|\/)helm\//i,
      /nginx\.conf$/i,
    ],
    type: [/devops|deploy|infra|release|ci\b|cd\b|git-master/i],
    tool: [/docker|kubectl|helm|terraform/i],
    weight: 3,
  },
  {
    floor: 'frontend',
    file: [/\.(tsx|jsx|vue|svelte|css|scss|sass|less)$/i, /(^|\/)components?\//i],
    type: [/front|\bui\b|design|css|style|visual/i],
    weight: 2,
  },
  {
    floor: 'backend',
    file: [/\.(py|go|rs|java|kt|rb|php|sql)$/i, /(^|\/)(server|api|migrations|db)\//i],
    type: [/back|api|server|database|db|queue|worker/i],
    weight: 2,
  },
];

function hits(patterns, values) {
  if (!patterns || !values.length) return 0;
  let n = 0;
  for (const value of values) {
    for (const re of patterns) {
      if (re.test(value)) {
        n += 1;
        break;
      }
    }
  }
  return n;
}

/**
 * @param {object} input ClassifyInput (plan 4.1)
 * @returns {{floor: string, confidence: number, reason: string, source: 'heuristic'}}
 */
export function classifyHeuristic(input = {}) {
  const files = input.files || [];
  const tools = input.tools || [];
  const typeText = [
    input.subagentType || '',
    input.agentName || '',
    input.description || '',
    input.agentDoc?.description || '',
    (input.agentDoc?.skills || []).join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  let best = null;
  for (const rule of RULES) {
    const fileHits = hits(rule.file, files);
    const typeHits = hits(rule.type, [typeText]);
    const toolHits = hits(rule.tool, tools.concat(files));
    const score = fileHits + typeHits * rule.weight + toolHits * 2;
    if (score > 0 && (!best || score > best.score)) {
      best = { floor: rule.floor, score, fileHits, typeHits, toolHits };
    }
  }

  if (!best) {
    return { floor: 'unknown', confidence: 0, reason: 'no-signal', source: 'heuristic' };
  }

  const confidence = Math.min(0.9, 0.35 + best.score * 0.12);
  const why = best.typeHits ? 'agent-type' : best.fileHits ? 'files' : 'tools';
  return {
    floor: best.floor,
    confidence: Number(confidence.toFixed(2)),
    reason: `${why}: ${best.floor}`,
    source: 'heuristic',
  };
}
