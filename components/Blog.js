import Reveal from "@/components/Reveal";
import SectionHead from "@/components/SectionHead";
import { posts } from "@/lib/posts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WORDS_PER_MINUTE = 150;

/** Formats an ISO date (YYYY-MM-DD) without the Intl API, so server and browser output match. */
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

function readingMinutes(post) {
  const words = post.body.reduce((total, block) => {
    if (block.type === "ul") {
      return total + block.items.reduce((sum, item) => sum + countWords(item), 0);
    }
    return total + countWords(block.text);
  }, 0);

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function PostBlock({ block }) {
  if (block.type === "h") {
    return <h4 className="post__subhead">{block.text}</h4>;
  }

  if (block.type === "ul") {
    return (
      <ul className="post__list">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p>{block.text}</p>;
}

/**
 * Blog section. Each article shows its summary; "Read article" opens the full text
 * with a native <details> element, so the text is in the HTML and needs no JavaScript.
 */
export default function Blog() {
  return (
    <section id="blog" className="section" aria-labelledby="blog-title">
      <div className="container">
        <SectionHead
          number="09"
          label="Blog"
          title="Lucky Petroleum news"
          titleId="blog-title"
          text="Practical notes on fuel, engine oil and safe refueling."
        />

        <div className="posts">
          {posts.map((post, index) => (
            <Reveal key={post.id} className="reveal-slot" delay={index * 0.12}>
              <article className="post">
                <p className="post__meta">
                  <span className="post__num">{String(index + 1).padStart(2, "0")}</span>
                  <span>{post.category}</span>
                  <span>{formatDate(post.date)}</span>
                  <span>{readingMinutes(post)} min read</span>
                </p>

                <h3 className="post__title">{post.title}</h3>
                <p className="post__excerpt">{post.excerpt}</p>

                <details className="post__details">
                  <summary className="link post__toggle">
                    <span className="post__toggle-closed">Read article</span>
                    <span className="post__toggle-open">Close article</span>
                  </summary>
                  <div className="post__body">
                    {post.body.map((block, blockIndex) => (
                      <PostBlock key={blockIndex} block={block} />
                    ))}
                  </div>
                </details>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
