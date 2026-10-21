import type { BlockRendererProps } from './types';

/** Наклон обводки номера: у каждого шага чуть свой, как от руки. */
const CIRCLE_TILT = [-8, 6, -3, 9];

/**
 * Шаги подключения на «салфетке»: номер, обведённый ручкой, заголовок, текст и
 * кнопки из настроек страницы подписки в панели. Стиль оформления, выбранный
 * в панели (cards/timeline/…), здесь не используется: у кабинета один вид.
 */
export function NapkinStepsBlock({
  blocks,
  getLocalizedText,
  renderBlockButtons,
}: BlockRendererProps) {
  const visibleBlocks = blocks.filter(
    (b) =>
      getLocalizedText(b.title) ||
      getLocalizedText(b.description) ||
      b.buttons?.length ||
      b.customNode,
  );

  if (!visibleBlocks.length) return null;

  return (
    <ol className="napkin-rows border-t-[1.5px] border-dashed border-dark-700">
      {visibleBlocks.map((block, index) => (
        <li key={index} className="grid grid-cols-[54px_minmax(0,1fr)] gap-3.5 py-5">
          <span className="relative h-[46px] w-12 text-accent-500" aria-hidden="true">
            <svg
              viewBox="0 0 48 46"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="absolute inset-0 h-full w-full"
            >
              <ellipse
                cx="24"
                cy="23"
                rx="21"
                ry="19"
                transform={`rotate(${CIRCLE_TILT[index % CIRCLE_TILT.length]} 24 23)`}
              />
            </svg>
            <b className="absolute inset-0 grid place-items-center font-hand text-3xl">
              {index + 1}
            </b>
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-dark-100">{getLocalizedText(block.title)}</h3>
            {getLocalizedText(block.description) && (
              <p className="mt-1 max-w-[56ch] whitespace-pre-line text-base leading-relaxed text-dark-400">
                {getLocalizedText(block.description)}
              </p>
            )}
            {renderBlockButtons(block.buttons, 'light')}
            {block.customNode}
          </div>
        </li>
      ))}
    </ol>
  );
}
