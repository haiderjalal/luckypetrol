import Reveal from "./Reveal";

export default function SectionHead({ eyebrow, title, text }) {
  return (
    <div className="section-head">
      <Reveal>
        <p className="eyebrow">{eyebrow}</p>
      </Reveal>
      <Reveal delay={0.1}>
        <h2>{title}</h2>
      </Reveal>
      {text && (
        <Reveal delay={0.2}>
          <p className="lead">{text}</p>
        </Reveal>
      )}
    </div>
  );
}
