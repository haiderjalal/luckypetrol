import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { news } from "@/lib/site";

export default function News() {
  return (
    <section id="news" className="section">
      <SectionHead eyebrow="Latest News" title="What's happening at Summit" />

      <div className="news-grid">
        {news.map((n, i) => (
          <Reveal key={n.title} delay={i * 0.1}>
            <article className="news-card">
              <span className="news-date">{n.date}</span>
              <h3>{n.title}</h3>
              <p>{n.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
