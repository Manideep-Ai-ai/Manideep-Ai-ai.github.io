import PixelAccents from './components/PixelAccents';
import type { CSSProperties } from 'react';
export function Arrow({down=false}:{down?:boolean}){return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={down?'arrow down':'arrow'}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
export function Seated({chair=false,className=''}:{chair?:boolean;className?:string}){return <div aria-label={chair?'Mani sitting at his computer':'Mani sitting on the portfolio lettering'} role="img" className={`seated ${chair?'chair-pose':'ledge-pose'} ${className}`}>
 {!chair&&<><div className="seat-body"/><div className="seat-leg leg-one"/><div className="seat-leg leg-two"/></>}
 </div>;}

export function Landing({onReplay,visible,progress}:{onReplay:()=>void;visible:boolean;progress:number}){
 return <main className={`landing ${visible?'is-visible':''}`} style={{opacity:progress}} aria-hidden={!visible} inert={!visible}>
  <header className="landing-header"><a href="./" className="logo-mark" aria-label="Manideep Reddy, home"><img src="/assets/logo.png" alt="" width="360" height="361"/></a><span className="header-name">MANIDEEP REDDY</span><span className="header-place">HYDERABAD, INDIA</span><nav className="header-links" aria-label="Landing"><a href="/resume.pdf" target="_blank" rel="noopener" data-track="contact-resume">Résumé ↗</a><button className="text-button" onClick={onReplay}>Back to my desk <svg className="replay-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9a7 7 0 1 1-1 6M5 4v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button></nav></header>
  <section className="landing-art" id="home" aria-labelledby="portfolio-title">
   <PixelAccents/>
   <div className="orbit-note note-one">Engineering the inside.<br/><span>Designing the outside.</span><svg viewBox="0 0 120 60" aria-hidden="true"><path d="M5 12Q80 5 92 45m-12-4 13 6 8-13"/></svg></div>
   <div className="orbit-note note-two">a curious mind,<br/>a few too many tabs.</div>
   <div className="word-scene"><h1 className="portfolio-word" id="portfolio-title" aria-label="Portfolio">{'PORTFOLIO'.split('').map((c,i)=><span key={i} style={{'--i':i} as CSSProperties} data-letter={c} aria-hidden="true">{c}<i/></span>)}</h1><Seated className="title-mani"/><div className="title-bubble">Made myself at home.</div></div>
   <div className="orbit-note note-three">Software engineering<br/><span>× UI / UX design</span></div>
   <div className="orbit-note note-four">Built with logic.<br/><span>Finished with feeling.</span></div>
  </section>
  <footer className="landing-footer"><div><span className="footer-hello">Hey, I’m Manideep.</span><p>I build backends, explore AI, and design<br className="desktop-break"/> the things people see and touch.</p></div><nav className="landing-links" aria-label="Sections"><a className="round-link" href="#work">What I build <Arrow down/></a><a className="round-link" href="#design">Seven portfolios <Arrow down/></a><a className="round-link" href="https://github.com/Manideep-Ai-ai" target="_blank" rel="noopener">GitHub <Arrow/></a></nav><span className="footer-side">A work in progress.<br/>Just like me.</span></footer>
 </main>;
}
