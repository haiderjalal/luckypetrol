/** Title, one-line description and optional action buttons at the top of a shop page. */
export default function PageHeader({ title, description, actions = null }) {
  return (
    <header className="shop-page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="shop-page-header__actions">{actions}</div> : null}
    </header>
  );
}
