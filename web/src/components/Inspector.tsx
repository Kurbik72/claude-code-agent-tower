import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import styles from './inspector.module.css';
import { STATUS_COLOR, TOOL_COLOR } from '../lib/format';
import { focusAgent } from '../lib/api';
import { useTower } from '../store/tower';

/** The historical tail reveals one line and one tool row per tick. */
const REVEAL_MS = 850;

/**
 * "внутри головы" — the agent inspector.
 *
 * Opening it subscribes the browser to that agent's thinking and tool stream
 * (plan 2.3): the accumulated tail arrives in the same response and unfolds one
 * row per tick, then live events append immediately.
 *
 * It renders through a portal onto `document.body` rather than inside the
 * canvas. The canvas is a pan/zoom surface — `touch-action: none` and a
 * non-passive wheel handler — so a modal nested in it has its scrolling eaten
 * by the zoom gesture before either column ever sees it.
 */
export function Inspector() {
  const { t } = useTranslation();
  const openAgent = useTower((s) => s.openAgent);
  const agent = useTower((s) => (s.openAgent ? s.agents[s.openAgent] : undefined));
  const floors = useTower((s) => s.floors);
  const detail = useTower((s) => s.detail);
  const revealedLines = useTower((s) => s.detailRevealed);
  const revealedTools = useTower((s) => s.toolsRevealed);
  const setOpen = useTower((s) => s.setOpen);
  const setDetail = useTower((s) => s.setDetail);
  const revealMore = useTower((s) => s.revealMore);
  const pushLocalEvent = useTower((s) => s.pushLocalEvent);

  const [tab, setTab] = useState<'thinking' | 'tools'>('thinking');
  // "still loading" and "there is genuinely nothing here" read identically if
  // both show the same placeholder, and every empty agent then looks like the
  // same agent. They are told apart.
  const [state, setState] = useState<'loading' | 'ready' | 'gone'>('loading');
  const announced = useRef<string | null>(null);
  const reasoning = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const shown = detail ? Math.min(revealedLines, detail.thinking.length) : 0;

  // Reasoning stays chronological and grows at the top as older lines unfold,
  // so the column holds its bottom edge for the newest line to stay put — but
  // only while the reader is already down there, or every reveal tick would
  // yank them back out of the history they scrolled up to read.
  useEffect(() => {
    const node = reasoning.current;
    if (node && pinned.current) node.scrollTop = node.scrollHeight;
  }, [shown]);

  useEffect(() => {
    if (!openAgent) return;
    let live = true;
    setState('loading');
    focusAgent(openAgent, true).then((next) => {
      if (!live) return;
      // the id is checked as well as the closure flag: a slow answer for the
      // agent that was open a moment ago must never land in this panel
      if (next && next.agentId === openAgent) {
        setDetail(next);
        setState('ready');
      } else {
        setState('gone');
      }
    });
    return () => {
      live = false;
      void focusAgent(openAgent, false);
    };
  }, [openAgent, setDetail]);

  useEffect(() => {
    if (!agent || announced.current === agent.id) return;
    announced.current = agent.id;
    pushLocalEvent('head.open', { name: agent.name });
  }, [agent, pushLocalEvent]);

  useEffect(() => {
    const timer = window.setInterval(revealMore, REVEAL_MS);
    return () => window.clearInterval(timer);
  }, [revealMore]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  if (!agent) return null;
  const floor = floors.find((f) => f.id === agent.floorId);

  // `slice(-0)` is `slice(0)` — the whole array — so an empty window is explicit
  const tail = <T,>(rows: T[], count: number): T[] => (count > 0 ? rows.slice(-count) : []);
  const lines = detail ? tail(detail.thinking, revealedLines) : [];
  // newest call first: the row an agent is running right now is what the panel
  // is opened for, and it must not sit at the bottom of a 100-row history
  const tools = detail ? tail(detail.tools, revealedTools).reverse() : [];
  const streaming = agent.status === 'work';
  // an empty column says which kind of empty it is: still loading, the agent
  // has gone, or it really has nothing to show yet
  const emptyLine = (what: 'Thinking' | 'Tools') =>
    state === 'ready' ? t(`inspector.no${what}`) : t(`inspector.${state}`);

  return createPortal(
    <div className={styles.backdrop} onClick={() => setOpen(null)}>
      <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.avatar}>
            <span className={styles.eye} style={{ left: 7 }} />
            <span className={styles.eye} style={{ left: 17 }} />
          </div>
          <div className={styles.headText}>
            <div className={styles.headTitleRow}>
              <span className={styles.headTitle}>{t('inspector.title', { name: agent.name })}</span>
              <span
                className={styles.headDot}
                style={{ background: STATUS_COLOR[agent.status] }}
              />
            </div>
            <div className={styles.headSub}>
              {[agent.role, agent.task || t(`status.${agent.status}`), agent.project]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <button type="button" className={styles.close} onClick={() => setOpen(null)}>
            {t('inspector.close')}
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'thinking' ? styles.tabActive : ''}`}
            onClick={() => setTab('thinking')}
          >
            {t('inspector.tabThinking')}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'tools' ? styles.tabActive : ''}`}
            onClick={() => setTab('tools')}
          >
            {t('inspector.tabTools')}
          </button>
        </div>

        <div className={styles.body}>
          <div
            ref={reasoning}
            className={`${styles.column} ${tab === 'tools' ? styles.hidden : ''}`}
            onScroll={(event) => {
              const node = event.currentTarget;
              pinned.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
            }}
          >
            <div className={styles.columnLabel}>{t('inspector.thinking')}</div>
            <div className={styles.lines}>
              {lines.length ? (
                lines.map((line) => (
                  <div key={line.id} className={styles.line}>
                    <span className={styles.marker}>›</span>
                    <span className={styles.lineText}>{line.text}</span>
                  </div>
                ))
              ) : (
                <div className={styles.line}>
                  <span className={styles.marker}>›</span>
                  <span className={styles.lineText}>{emptyLine('Thinking')}</span>
                </div>
              )}
              {streaming ? <div className={styles.caret} /> : null}
            </div>
          </div>

          <div
            className={`${styles.column} ${styles.columnAlt} ${tab === 'thinking' ? styles.hidden : ''}`}
          >
            <div className={styles.columnLabel}>{t('inspector.tools')}</div>
            <div className={styles.tools}>
              {tools.length ? (
                tools.map((tool) => (
                  <div
                    key={tool.id}
                    className={styles.tool}
                    style={{ borderLeftColor: TOOL_COLOR[tool.status] }}
                  >
                    <span className={styles.toolName}>{tool.label}</span>
                    <span className={styles.toolStatus} style={{ color: TOOL_COLOR[tool.status] }}>
                      {t(`tool.${tool.status}`)}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.line}>
                  <span className={styles.marker}>›</span>
                  <span className={styles.lineText}>{emptyLine('Tools')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.foot}>
          {t('inspector.footer', {
            num: floor?.num ?? '—',
            pct: detail?.contextPct ?? agent.contextPct,
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
