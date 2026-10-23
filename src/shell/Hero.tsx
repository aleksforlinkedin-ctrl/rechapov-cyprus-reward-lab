export function Hero() {
  return <section className="promo-hero" aria-label="Daily rewards introduction">
    <div className="hero-copy"><p className="hero-eyebrow"><span /> A LITTLE MORE REWARDING</p><h2>Your day.<br />Your rewards.</h2><p>Earn coins from<br />qualifying bets.</p></div>
    <div className="coin-art" aria-hidden="true"><div className="coin-orbit" /><div className="hero-disc"><div className="disc-rim"><svg viewBox="0 0 80 80"><path d="M40 13 48 32 67 40 48 48 40 67 32 48 13 40 32 32Z" /><path className="disc-cross" d="M40 19V61M19 40H61" /></svg></div></div><span className="coin-spark spark-one">+</span><span className="coin-spark spark-two">+</span></div>
  </section>;
}
