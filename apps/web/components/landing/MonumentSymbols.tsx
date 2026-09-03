// Hand-drawn ink-sketch line art for Pune (Shaniwar Wada) and Mumbai
// (Gateway of India) — from the Claude Design canvas exploration, option
// 1c. Defined once as hidden <symbol>s, referenced via <use> from
// DiptychHero so the same path data can redraw itself (see .ink-draw's
// keyframe animation in classical-landing.css) independently per instance,
// on both first paint and every hover.
//
// Rendered via dangerouslySetInnerHTML rather than transcribed to JSX: this
// is ~90 hand-authored path elements (each with a precise `d` and, on many,
// an inline animation delay tuned against its neighbors) copied verbatim
// from the design file. Hand-converting that much path data to JSX risked
// a silent one-character typo breaking a curve; the content itself is
// static, developer-authored markup with no user input anywhere in it, so
// the usual injection risk this API carries doesn't apply here.
const MONUMENT_SYMBOLS_MARKUP = `
<symbol id="m-pune" viewBox="0 0 400 220" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1">
  <path stroke="none" fill="var(--color-accent-100)" d="M20 190V152h46v38zM380 190V152h-46v38z" style="animation:classical-wash 1.1s ease-out 2.15s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M64 190L74 112q51-8 102 0V190z" style="animation:classical-wash 1.1s ease-out 2.05s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M336 190L326 112q-51-8-102 0V190z" style="animation:classical-wash 1.1s ease-out 2.05s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M176 190V98h48v92z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M164 98V68h72v30z" style="animation:classical-wash 1.1s ease-out 2.2s both"></path>
  <path stroke="none" fill="var(--color-accent-500)" d="M200 28c9-6 16 5 25 0v9c-9 6-16-5-25 0z" style="animation:classical-wash 1s ease-out 2.4s both"></path>
  <path fill="none" d="M10 204h380" pathLength="1"></path>
  <path fill="none" d="M24 198h352" pathLength="1"></path>
  <path fill="none" d="M182 198v-6h36v6M188 192v-5h24v5" pathLength="1"></path>
  <path fill="none" d="M20 190V152h46" pathLength="1"></path>
  <path fill="none" d="M380 190V152h-46" pathLength="1"></path>
  <path fill="none" d="M22 152v-6h8v6M34 152v-6h8v6M46 152v-6h8v6M58 152v-6h8v6" pathLength="1"></path>
  <path fill="none" d="M378 152v-6h-8v6M366 152v-6h-8v6M354 152v-6h-8v6M342 152v-6h-8v6" pathLength="1"></path>
  <path fill="none" d="M28 178v-14M40 178v-14M52 178v-14M64 178v-14" pathLength="1"></path>
  <path fill="none" d="M372 178v-14M360 178v-14M348 178v-14M336 178v-14" pathLength="1"></path>
  <path fill="none" d="M64 190L74 112q51-8 102 0" pathLength="1"></path>
  <path fill="none" d="M336 190L326 112q-51-8-102 0" pathLength="1"></path>
  <path fill="none" d="M72 126q52-8 104 0" pathLength="1"></path>
  <path fill="none" d="M328 126q-52-8-104 0" pathLength="1"></path>
  <path fill="none" d="M66 182q54-8 110 0" pathLength="1"></path>
  <path fill="none" d="M334 182q-54-8-110 0" pathLength="1"></path>
  <path fill="none" d="M80 122v-5a4 4 0 0 1 8 0v5M97 121v-5a4 4 0 0 1 8 0v5M114 120v-5a4 4 0 0 1 8 0v5M131 119v-5a4 4 0 0 1 8 0v5M148 119v-5a4 4 0 0 1 8 0v5M165 119v-5a4 4 0 0 1 8 0v5" pathLength="1"></path>
  <path fill="none" d="M312 122v-5a4 4 0 0 1 8 0v5M295 121v-5a4 4 0 0 1 8 0v5M278 120v-5a4 4 0 0 1 8 0v5M261 119v-5a4 4 0 0 1 8 0v5M244 119v-5a4 4 0 0 1 8 0v5M227 119v-5a4 4 0 0 1 8 0v5" pathLength="1"></path>
  <path fill="none" d="M80 172v-26M96 172v-26M112 172v-26M128 172v-26M144 172v-26M160 172v-26" pathLength="1"></path>
  <path fill="none" d="M320 172v-26M304 172v-26M288 172v-26M272 172v-26M256 172v-26M240 172v-26" pathLength="1"></path>
  <path fill="none" d="M176 190V98h48v92" pathLength="1"></path>
  <path fill="none" d="M172 98h56" pathLength="1"></path>
  <path fill="none" d="M177 110V104a4 4 0 0 1 8 0v6M186 110V104a4 4 0 0 1 8 0v6M195 110V104a4 4 0 0 1 8 0v6M204 110V104a4 4 0 0 1 8 0v6M213 110V104a4 4 0 0 1 8 0v6" pathLength="1"></path>
  <path fill="none" d="M164 98V68h72v30" pathLength="1"></path>
  <path fill="none" d="M168 94V82a6 6 0 0 1 12 0v12M182 94V82a6 6 0 0 1 12 0v12M196 94V82a6 6 0 0 1 12 0v12M210 94V82a6 6 0 0 1 12 0v12M224 94V82a6 6 0 0 1 12 0v12" pathLength="1"></path>
  <path fill="none" d="M160 98h80" pathLength="1"></path>
  <path fill="none" d="M162 102h76" pathLength="1"></path>
  <path fill="none" d="M154 68l10-8h72l10 8" pathLength="1"></path>
  <path fill="none" d="M154 72h92" pathLength="1"></path>
  <path fill="none" d="M160 60h80" pathLength="1"></path>
  <path fill="none" d="M200 60V28" pathLength="1"></path>
  <path fill="none" d="M200 28c9-6 16 5 25 0v9c-9 6-16-5-25 0" pathLength="1"></path>
  <path fill="none" d="M182 190v-52h36v52" pathLength="1"></path>
  <path fill="none" d="M185 190v-28C185 150 191 142 200 137c9 5 15 13 15 25v28" pathLength="1"></path>
  <path fill="none" d="M190 190v-24C190 154 195 147 200 143c5 4 10 11 10 23v24" pathLength="1"></path>
  <path fill="none" d="M178 150a3.5 3.5 0 1 1 7 0a3.5 3.5 0 1 1-7 0M215 150a3.5 3.5 0 1 1 7 0a3.5 3.5 0 1 1-7 0" pathLength="1"></path>
  <path fill="none" d="M190 133V126h20v7" pathLength="1"></path>
</symbol>
<symbol id="m-mumbai" viewBox="0 0 400 220" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1">
  <path stroke="none" fill="var(--color-accent-100)" d="M34 196V118h116v78z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M366 196V118H250v78z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M150 196V106h22v90zM228 196V106h22v90zM150 106h100V54H150z" style="animation:classical-wash 1.3s ease-out 0.95s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M162 82V66h76v16z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path fill="none" d="M10 204h380" pathLength="1"></path>
  <path fill="none" d="M22 196h356" pathLength="1"></path>
  <path fill="none" d="M34 196V118h116" pathLength="1"></path>
  <path fill="none" d="M26 118h132" pathLength="1"></path>
  <path fill="none" d="M26 112h132" pathLength="1"></path>
  <path fill="none" d="M44 136V124h96v12" pathLength="1"></path>
  <path fill="none" d="M52 130q6-6 12 0t12 0t12 0t12 0t12 0t12 0t12 0" pathLength="1"></path>
  <path fill="none" d="M34 140h116" pathLength="1"></path>
  <path fill="none" d="M40 148v-8M50 148v-8M60 148v-8M70 148v-8M80 148v-8M90 148v-8M100 148v-8M110 148v-8M120 148v-8M130 148v-8M140 148v-8" pathLength="1"></path>
  <path fill="none" d="M66 196v-24c0-14 11-24 26-30 15 6 26 16 26 30v24" pathLength="1"></path>
  <path fill="none" d="M80 176v-24M88 176v-26M96 176v-26M104 176v-24" pathLength="1"></path>
  <path fill="none" d="M76 158h32M76 166h32M76 174h32" pathLength="1"></path>
  <path fill="none" d="M82 196v-12c0-6 4-10 10-14 6 4 10 8 10 14v12" pathLength="1"></path>
  <path fill="none" d="M366 196V118H250" pathLength="1"></path>
  <path fill="none" d="M374 118H242" pathLength="1"></path>
  <path fill="none" d="M374 112H242" pathLength="1"></path>
  <path fill="none" d="M356 136V124h-96v12" pathLength="1"></path>
  <path fill="none" d="M348 130q-6-6-12 0t-12 0t-12 0t-12 0t-12 0t-12 0t-12 0" pathLength="1"></path>
  <path fill="none" d="M366 140H250" pathLength="1"></path>
  <path fill="none" d="M360 148v-8M350 148v-8M340 148v-8M330 148v-8M320 148v-8M310 148v-8M300 148v-8M290 148v-8M280 148v-8M270 148v-8M260 148v-8" pathLength="1"></path>
  <path fill="none" d="M334 196v-24c0-14-11-24-26-30-15 6-26 16-26 30v24" pathLength="1"></path>
  <path fill="none" d="M320 176v-24M312 176v-26M304 176v-26M296 176v-24" pathLength="1"></path>
  <path fill="none" d="M324 158h-32M324 166h-32M324 174h-32" pathLength="1"></path>
  <path fill="none" d="M318 196v-12c0-6-4-10-10-14-6 4-10 8-10 14v12" pathLength="1"></path>
  <path fill="none" d="M150 196V54M250 196V54" pathLength="1"></path>
  <path fill="none" d="M144 96h112" pathLength="1"></path>
  <path fill="none" d="M144 106h112" pathLength="1"></path>
  <path fill="none" d="M152 106v-10M160 106v-10M168 106v-10M176 106v-10M184 106v-10M192 106v-10M200 106v-10M208 106v-10M216 106v-10M224 106v-10M232 106v-10M240 106v-10M248 106v-10" pathLength="1"></path>
  <path fill="none" d="M156 88V60h88v28" pathLength="1"></path>
  <path fill="none" d="M162 82V66h76v16" pathLength="1"></path>
  <path fill="none" d="M150 60h100" pathLength="1"></path>
  <path fill="none" d="M150 54h100" pathLength="1"></path>
  <path fill="none" d="M154 54v-6l4-5 4 5v6M166 54v-6l4-5 4 5v6M178 54v-6l4-5 4 5v6M190 54v-6l4-5 4 5v6M202 54v-6l4-5 4 5v6M214 54v-6l4-5 4 5v6M226 54v-6l4-5 4 5v6M238 54v-6l4-5 4 5v6" pathLength="1"></path>
  <path fill="none" d="M172 196v-28C172 148 178 128 200 118c22 10 28 30 28 50v28" pathLength="1"></path>
  <path fill="none" d="M178 196v-26C178 150 184 133 200 124c16 9 22 26 22 46v26" pathLength="1"></path>
  <path fill="none" d="M186 196v-24C186 154 191 139 200 131c9 8 14 23 14 41v24" pathLength="1"></path>
  <path fill="none" d="M160 152a5 5 0 1 1 10 0a5 5 0 1 1-10 0M230 152a5 5 0 1 1 10 0a5 5 0 1 1-10 0" pathLength="1"></path>
  <path fill="none" d="M172 196v-12h-18v6h-8v6M228 196v-12h18v6h8v6" pathLength="1"></path>
  <path fill="none" d="M152 54V40h18v14" pathLength="1"></path>
  <path fill="none" d="M147 40h28M147 36h28" pathLength="1"></path>
  <path fill="none" d="M155 36V24h12v12" pathLength="1"></path>
  <path fill="none" d="M158 34v-6M164 34v-6" pathLength="1"></path>
  <path fill="none" d="M153 24c1-10 5-16 8-16s7 6 8 16" pathLength="1"></path>
  <path fill="none" d="M161 8V2" pathLength="1"></path>
  <path fill="none" d="M230 54V40h18v14" pathLength="1"></path>
  <path fill="none" d="M225 40h28M225 36h28" pathLength="1"></path>
  <path fill="none" d="M233 36V24h12v12" pathLength="1"></path>
  <path fill="none" d="M236 34v-6M242 34v-6" pathLength="1"></path>
  <path fill="none" d="M231 24c1-10 5-16 8-16s7 6 8 16" pathLength="1"></path>
  <path fill="none" d="M239 8V2" pathLength="1"></path>
</symbol>
`;

export function MonumentSymbols() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: MONUMENT_SYMBOLS_MARKUP }}
    />
  );
}
