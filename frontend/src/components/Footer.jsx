import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-midnight text-white">
      <div className="page-x grid gap-10 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-serif text-[28px] font-semibold uppercase tracking-[0.16em]">Shako Lake</p>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/60">
            Unsupervised classification and Markov chain change analysis of a glacial lake basin in North
            Sikkim, from nine Sentinel-2 observations, 14 November – 24 December 2025.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="font-mono text-[12px] text-white/45">Experiments</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li>
              <Link to="/kmeans" className="text-white/80 hover:text-coral">
                U3 — K-Means classification
              </Link>
            </li>
            <li>
              <Link to="/markov" className="text-white/80 hover:text-coral">
                U4 — Markov chain change analysis
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <p className="font-mono text-[12px] text-white/45">Data</p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
            Every result is read from the executed notebooks <span className="font-mono text-white/80">KMeans_Sentinel2.ipynb</span>{" "}
            and <span className="font-mono text-white/80">Shako_Sentinel2_Markov.ipynb</span>. Imagery: Copernicus Sentinel-2.
            Landscape artwork is a procedural render, not a photograph of Shako Cho.
          </p>
        </div>
      </div>
    </footer>
  );
}
