"use client";
import { COUNTRIES_48 } from "../lib/constants";

// Country flag image URLs using flagcdn.com
const COUNTRY_FLAGS: Record<string, string> = {
  "Argentina": "https://flagcdn.com/ar.svg", "Australia": "https://flagcdn.com/au.svg", "Belgium": "https://flagcdn.com/be.svg", "Brazil": "https://flagcdn.com/br.svg",
  "Canada": "https://flagcdn.com/ca.svg", "Croatia": "https://flagcdn.com/hr.svg", "Denmark": "https://flagcdn.com/dk.svg", "England": "https://flagcdn.com/gb-eng.svg",
  "France": "https://flagcdn.com/fr.svg", "Germany": "https://flagcdn.com/de.svg", "Italy": "https://flagcdn.com/it.svg", "Japan": "https://flagcdn.com/jp.svg",
  "Mexico": "https://flagcdn.com/mx.svg", "Morocco": "https://flagcdn.com/ma.svg", "Netherlands": "https://flagcdn.com/nl.svg", "Nigeria": "https://flagcdn.com/ng.svg",
  "Portugal": "https://flagcdn.com/pt.svg", "Qatar": "https://flagcdn.com/qa.svg", "Saudi Arabia": "https://flagcdn.com/sa.svg", "South Korea": "https://flagcdn.com/kr.svg",
  "Spain": "https://flagcdn.com/es.svg", "Sweden": "https://flagcdn.com/se.svg", "Switzerland": "https://flagcdn.com/ch.svg", "USA": "https://flagcdn.com/us.svg",
  "Uruguay": "https://flagcdn.com/uy.svg", "Poland": "https://flagcdn.com/pl.svg", "Colombia": "https://flagcdn.com/co.svg", "Ecuador": "https://flagcdn.com/ec.svg",
  "Chile": "https://flagcdn.com/cl.svg", "Peru": "https://flagcdn.com/pe.svg", "Ghana": "https://flagcdn.com/gh.svg", "Senegal": "https://flagcdn.com/sn.svg",
  "Cameroon": "https://flagcdn.com/cm.svg", "Ivory Coast": "https://flagcdn.com/ci.svg", "Algeria": "https://flagcdn.com/dz.svg", "Tunisia": "https://flagcdn.com/tn.svg",
  "Ukraine": "https://flagcdn.com/ua.svg", "Wales": "https://flagcdn.com/gb-wls.svg", "Scotland": "https://flagcdn.com/gb-sct.svg", "Turkey": "https://flagcdn.com/tr.svg",
  "Iran": "https://flagcdn.com/ir.svg", "Iraq": "https://flagcdn.com/iq.svg", "Greece": "https://flagcdn.com/gr.svg", "Czechia": "https://flagcdn.com/cz.svg",
  "Austria": "https://flagcdn.com/at.svg", "China": "https://flagcdn.com/cn.svg", "TBD": "https://flagcdn.com/xx.svg"
};

type Props = {
  label: string;
  value: string;
  onChange: (name: string) => void;
};

export default function CountryGrid({ label, value, onChange }: Props) {
  return (
    <div className="w-full">
      <p className="mb-2 text-sm text-purple-300">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {COUNTRIES_48.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`h-12 rounded border text-xs px-2 overflow-hidden text-ellipsis flex flex-col items-center justify-center gap-1 transition-all duration-200
              ${value === c 
                ? "border-purple-500 bg-purple-600 text-white shadow-lg" 
                : "border-gray-600 bg-gray-700 text-gray-300 hover:border-purple-400 hover:bg-gray-600 hover:text-white"
              }`}
            title={c}
          >
            <img 
              src={COUNTRY_FLAGS[c] || "https://flagcdn.com/xx.svg"} 
              alt={`${c} flag`}
              className="w-4 h-3 object-cover rounded-sm"
              onError={(e) => {
                // Fallback to a generic flag if the image fails to load
                e.currentTarget.src = "https://flagcdn.com/xx.svg";
              }}
            />
            <span className="text-xs leading-tight">{c}</span>
          </button>
        ))}
      </div>
    </div>
  );
}