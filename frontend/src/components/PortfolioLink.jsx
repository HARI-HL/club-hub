export default function PortfolioLink({ url }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="meta inline-block border border-accent/60 px-[0.5rem] py-[0.3rem] text-accent transition-colors duration-300 ease-studio hover:bg-accent hover:text-accent-ink"
    >
      [VIEW PORTFOLIO / PROOF OF WORK &#8599;]
    </a>
  );
}
