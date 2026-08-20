import { byOrder, type ResumeDocument, type ResumeSection } from "@resume-builder/core";

export function ResumePreview({ resume }: { resume: ResumeDocument }) {
  return (
    <article className="resume-page" data-page-size={resume.design.pageSize}>
      <header className="resume-header" data-block-id="header">
        <h2>{resume.header.fullName}</h2>
        {resume.header.headline ? <p>{resume.header.headline}</p> : null}
        {resume.header.location ? <p>{resume.header.location}</p> : null}
        <ul>
          {byOrder(resume.header.contacts).map((contact) => (
            <li key={contact.id}>{contact.label ? `${contact.label}: ` : ""}{contact.value}</li>
          ))}
        </ul>
      </header>
      {byOrder(resume.sections).filter((section) => section.visible).map((section) => (
        <ResumeSectionView key={section.id} section={section} />
      ))}
    </article>
  );
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  return (
    <section className="resume-section" data-section-id={section.id} data-section-type={section.type}>
      <h3 data-block-id={`section:${section.id}:header`}>{section.title}</h3>
      {renderItems(section)}
    </section>
  );
}

function renderItems(section: ResumeSection) {
  switch (section.type) {
    case "summary":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <p className="resume-item" key={item.id}>{item.text}</p>
      ));
    case "experience":
    case "volunteer":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.role}</strong>, {item.organization}
            {item.location ? `, ${item.location}` : ""}
            <span>{formatDateRange(item.startDate, item.endDate)}</span>
          </p>
          {"summary" in item && typeof item.summary === "string" && item.summary.length > 0 ? (
            <p data-block-id={`section:${section.id}:item:${item.id}:summary`}>{item.summary}</p>
          ) : null}
          {renderBullets(section.id, item.id, item.bullets)}
        </div>
      ));
    case "education":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.degree}</strong>, {item.institution}
            {item.location ? `, ${item.location}` : ""}
            <span>{formatDateRange(item.startDate, item.endDate)}</span>
          </p>
          {item.detail ? <p data-block-id={`section:${section.id}:item:${item.id}:detail`}>{item.detail}</p> : null}
          {renderBullets(section.id, item.id, item.bullets)}
        </div>
      ));
    case "skills":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.groupLabel}</strong>: {item.entries.join(", ")}
          </p>
        </div>
      ));
    case "projects":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.name}</strong>{item.role ? `, ${item.role}` : ""}
            {item.url ? `, ${item.url}` : ""}
            <span>{formatDateRange(item.startDate, item.endDate)}</span>
          </p>
          {item.summary ? (
            <p data-block-id={`section:${section.id}:item:${item.id}:summary`}>{item.summary}</p>
          ) : null}
          {renderBullets(section.id, item.id, item.bullets)}
        </div>
      ));
    case "certifications":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.name}</strong>, {item.issuer}
            <span>{item.date}</span>
          </p>
          {item.credentialId ? (
            <p data-block-id={`section:${section.id}:item:${item.id}:credential`}>
              Credential: {item.credentialId}
            </p>
          ) : null}
        </div>
      ));
    case "awards":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.name}</strong>, {item.issuer}
            <span>{item.date}</span>
          </p>
          {item.detail ? <p data-block-id={`section:${section.id}:item:${item.id}:detail`}>{item.detail}</p> : null}
        </div>
      ));
    case "publications":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            <strong>{item.title}</strong>, {item.venue}
            {item.url ? `, ${item.url}` : ""}
            <span>{item.date}</span>
          </p>
        </div>
      ));
    case "custom":
      return byOrder(section.items).filter((item) => item.visible).map((item) => (
        <div className="resume-item" key={item.id}>
          <p data-block-id={`section:${section.id}:item:${item.id}`}>
            {item.title ? <strong>{item.title}</strong> : item.text}
          </p>
          {item.title && item.text ? (
            <p data-block-id={`section:${section.id}:item:${item.id}:text`}>{item.text}</p>
          ) : null}
          {renderBullets(section.id, item.id, item.bullets)}
        </div>
      ));
  }
}

function renderBullets(sectionId: string, itemId: string, bullets: Array<{ id: string; order: number; text: string }>) {
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

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "";
  }

  return `${startDate ?? ""} - ${endDate ?? ""}`;
}
