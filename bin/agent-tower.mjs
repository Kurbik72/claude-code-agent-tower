#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createServer, listen } from '../server/index.js';
import { DEFAULT_PROJECTS_DIR, resolveClassifier } from '../server/config.js';

const USAGE = `
  agent-tower - isometric tower of live Claude Code agents

  Options
    --port <n>            preferred port (default 7788, increments if busy)
    --no-open             do not open a browser
    --projects-dir <p>    transcripts root (default ~/.claude/projects)
    --deepseek-key <k>    use your own DeepSeek key instead of the shared proxy
    --proxy-url <u>       classification proxy (default: the project's)
    --no-ai               heuristic classifier only, no network
    --help
`;

function parseArgs(argv) {
  const args = {
    port: 7788,
    open: true,
    projectsDir: DEFAULT_PROJECTS_DIR,
    deepseekKey: '',
    proxyUrl: '',
    noAi: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--no-open') args.open = false;
    else if (arg === '--no-ai') args.noAi = true;
    else if (arg === '--port') args.port = Number(argv[++i]) || args.port;
    else if (arg === '--projects-dir') args.projectsDir = argv[++i] || args.projectsDir;
    else if (arg === '--deepseek-key') args.deepseekKey = argv[++i] || '';
    else if (arg === '--proxy-url') args.proxyUrl = argv[++i] || '';
  }
  return args;
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  const child = spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' });
  child.unref();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(USAGE);
    return;
  }

  const classifier = await resolveClassifier({
    flagKey: args.deepseekKey,
    flagProxyUrl: args.proxyUrl,
    noAi: args.noAi,
  });

  const { app, hasWeb } = await createServer({
    projectsDir: args.projectsDir,
    deepseekKey: classifier.apiKey,
    proxyUrl: classifier.proxyUrl,
    noAi: args.noAi,
  });

  const address = await listen(app, args.port);
  const url = address.replace('127.0.0.1', 'localhost');

  process.stdout.write(`\n  agent-tower  ${url}\n`);
  process.stdout.write(`  transcripts  ${args.projectsDir}\n`);
  const CLASSIFIER_LABEL = {
    deepseek: 'deepseek (your key) + heuristic',
    proxy: 'deepseek (shared proxy) + heuristic',
    heuristic: 'heuristic only',
  };
  process.stdout.write(`  classifier   ${CLASSIFIER_LABEL[classifier.mode]}\n\n`);
  if (!hasWeb) {
    process.stdout.write('  the frontend is not built yet - run `npm run build`\n\n');
  }

  if (args.open && hasWeb) openBrowser(url);

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  process.stderr.write(`agent-tower failed to start: ${error.message}\n`);
  process.exit(1);
});
