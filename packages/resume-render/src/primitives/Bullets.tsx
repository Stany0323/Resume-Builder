import { byOrder } from "@resume-builder/core";

export function Bullets({
  sectionId,
  itemId,
  bullets,
}: {
  sectionId: string;
  itemId: string;
  bullets: Array<{ id: string; order: number; text: string }>;
}) {
  const visibleBullets = byOrder(bullets);

  if (visibleBullets.length === 0) {
    return null;
  }

  return (
    <ul className="resume-bullets">
      {visibleBullets.map((bullet) => (
        <li key={bullet.id} data-block-id={`section:${sectionId}:item:${itemId}:bullet:${bullet.id}`}>
          {bullet.text}
        </li>
      ))}
    </ul>
  );
}
