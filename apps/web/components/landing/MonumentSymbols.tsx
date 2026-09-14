// Hand-drawn ink-sketch line art for Pune (Shaniwar Wada), Mumbai (Gateway
// of India) and Bengaluru (Bangalore Palace) — from the Claude Design canvas
// exploration, options 1c and 2a/2b — plus "m-more", the quiet pin plate
// that fills the empty half of the landing page's last page. m-bengaluru
// keeps the design file's 1400x820 drawing and scale, with its viewBox
// shifted down 89 units so the ground line lands where Pune's and Mumbai's
// do (about 204/220) instead of floating above the city name. Defined once as hidden <symbol>s, referenced via <use> from
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
<symbol id="m-bengaluru" viewBox="0 -89 1400 820" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1">
  <path stroke="none" fill="var(--color-accent-100)" d="M150 640V390h95v250zM340 640V385h95v255z" style="animation:classical-wash 1.1s ease-out 2.15s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M245 640V455h95v185z" style="animation:classical-wash 1.1s ease-out 2.05s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M430 640V510Q700 430 970 510V640Z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M545 470V355h310v115z" style="animation:classical-wash 1.1s ease-out 2.2s both"></path>
  <path stroke="none" fill="var(--color-accent-500)" d="M535 355h330L700 315z" style="animation:classical-wash 1s ease-out 2.4s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M655 355V145h90v210z" style="animation:classical-wash 1.1s ease-out 2.3s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M970 640V455h100v185zM1070 640V430h115v210z" style="animation:classical-wash 1.1s ease-out 2.05s both"></path>
  <path stroke="none" fill="var(--color-accent-100)" d="M1185 640V385h95v255z" style="animation:classical-wash 1.1s ease-out 2.15s both"></path>
  <line x1="100" y1="640" x2="1300" y2="640" stroke-width="3" pathLength="1"></line>
  <line x1="130" y1="660" x2="1270" y2="660" stroke-width="3" pathLength="1"></line>
  <rect x="150" y="390" width="95" height="250" stroke-width="3" pathLength="1"></rect>
  <path d="M145 390 L250 390 L250 365 L240 365 L240 340 L225 340 L225 365 L210 365 L210 340 L195 340 L195 365 L180 365 L180 340 L165 340 L165 365 L155 365 Z" stroke-width="3" pathLength="1"></path>
  <rect x="340" y="385" width="95" height="255" stroke-width="3" pathLength="1"></rect>
  <path d="M335 385 L440 385 L440 360 L430 360 L430 335 L415 335 L415 360 L400 360 L400 335 L385 335 L385 360 L370 360 L370 335 L355 335 L355 360 L345 360 Z" stroke-width="3" pathLength="1"></path>
  <rect x="245" y="455" width="95" height="185" stroke-width="3" pathLength="1"></rect>
  <path d="M245 455 L340 455 L340 435 L330 435 L330 420 L315 420 L315 435 L300 435 L300 420 L285 420 L285 435 L270 435 L270 420 L255 420 L255 435 L245 435 Z" stroke-width="3" pathLength="1"></path>
  <path d="M175 640 L175 535 Q195 505 215 535 L215 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M175 535 Q195 490 215 535" stroke-width="2.2" pathLength="1"></path>
  <path d="M188 540 L188 635 M202 540 L202 635" stroke-width="1.8" pathLength="1"></path>
  <path d="M180 555 L210 555 M178 575 L212 575 M176 595 L214 595 M175 615 L215 615" stroke-width="1.8" pathLength="1"></path>
  <path d="M270 510 Q280 495 290 510 L290 545 L270 545 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M305 510 Q315 495 325 510 L325 545 L305 545 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M270 565 Q280 550 290 565 L290 600 L270 600 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M305 565 Q315 550 325 565 L325 600 L305 600 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M178 420 Q188 410 198 420 L198 448 L178 448 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M205 420 Q215 410 225 420 L225 448 L205 448 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M368 415 Q378 405 388 415 L388 443 L368 443 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M395 415 Q405 405 415 415 L415 443 L395 443 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M430 640 L430 510 Q700 430 970 510 L970 640 Z" stroke-width="3" pathLength="1"></path>
  <path d="M425 510 Q700 425 975 510" stroke-width="3" pathLength="1"></path>
  <path d="M445 490 Q700 420 955 490" stroke-width="3" pathLength="1"></path>
  <path d="M445 490 L445 470 L955 470 L955 490" stroke-width="3" pathLength="1"></path>
  <path d="M545 470 L545 355 L855 355 L855 470" stroke-width="3" pathLength="1"></path>
  <path d="M535 355 L865 355 L700 315 Z" stroke-width="3" pathLength="1"></path>
  <path d="M700 315 L700 295" stroke-width="3" pathLength="1"></path>
  <circle cx="700" cy="290" r="5" stroke-width="3" pathLength="1"></circle>
  <path d="M575 390 Q588 370 601 390 L601 420 L575 420 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M625 390 Q638 370 651 390 L651 420 L625 420 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M675 390 Q688 370 701 390 L701 420 L675 420 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M725 390 Q738 370 751 390 L751 420 L725 420 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M775 390 Q788 370 801 390 L801 420 L775 420 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M825 390 Q838 370 851 390 L851 420 L825 420 Z" stroke-width="1.8" pathLength="1"></path>
  <line x1="455" y1="485" x2="945" y2="485" stroke-width="1.8" pathLength="1"></line>
  <path d="M470 470 L470 495 M500 465 L500 495 M530 458 L530 495 M560 452 L560 495 M590 447 L590 495 M620 442 L620 495 M650 438 L650 495 M680 435 L680 495 M710 435 L710 495 M740 438 L740 495 M770 442 L770 495 M800 447 L800 495 M830 452 L830 495 M860 458 L860 495 M890 465 L890 495 M920 470 L920 495" stroke-width="1.8" pathLength="1"></path>
  <path d="M470 640 L470 550 Q495 515 520 550 L520 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M535 640 L535 540 Q560 505 585 540 L585 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M600 640 L600 535 Q625 500 650 535 L650 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M665 640 L665 525 Q700 490 735 525 L735 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M750 640 L750 535 Q775 500 800 535 L800 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M815 640 L815 540 Q840 505 865 540 L865 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M880 640 L880 550 Q905 515 930 550 L930 640" stroke-width="2.2" pathLength="1"></path>
  <path d="M655 640 L655 570 Q700 525 745 570 L745 640" stroke-width="2.2" pathLength="1"></path>
  <rect x="675" y="580" width="50" height="60" stroke-width="2.2" pathLength="1"></rect>
  <line x1="692" y1="580" x2="692" y2="640" stroke-width="1.8" pathLength="1"></line>
  <line x1="708" y1="580" x2="708" y2="640" stroke-width="1.8" pathLength="1"></line>
  <line x1="675" y1="600" x2="725" y2="600" stroke-width="1.8" pathLength="1"></line>
  <line x1="675" y1="620" x2="725" y2="620" stroke-width="1.8" pathLength="1"></line>
  <circle cx="500" cy="520" r="5" stroke-width="2.2" pathLength="1"></circle>
  <circle cx="575" cy="510" r="5" stroke-width="2.2" pathLength="1"></circle>
  <circle cx="825" cy="510" r="5" stroke-width="2.2" pathLength="1"></circle>
  <circle cx="900" cy="520" r="5" stroke-width="2.2" pathLength="1"></circle>
  <rect x="655" y="145" width="90" height="210" stroke-width="3" pathLength="1"></rect>
  <path d="M645 145 L755 145 L755 120 L745 120 L745 90 L735 90 L735 120 L725 120 L725 78 L715 78 L715 120 L705 120 L705 70 L695 70 L695 120 L685 120 L685 90 L675 90 L675 120 L655 120 Z" stroke-width="3" pathLength="1"></path>
  <path d="M690 200 Q700 185 710 200 L710 230 L690 230 Z" stroke-width="2.2" pathLength="1"></path>
  <line x1="700" y1="70" x2="700" y2="45" stroke-width="3" pathLength="1"></line>
  <circle cx="700" cy="40" r="4" stroke-width="3" pathLength="1"></circle>
  <path d="M670 145 L730 145" stroke-width="1.8" pathLength="1"></path>
  <rect x="970" y="455" width="100" height="185" stroke-width="3" pathLength="1"></rect>
  <path d="M970 455 L1070 455 L1070 435 L1060 435 L1060 420 L1045 420 L1045 435 L1030 435 L1030 420 L1015 420 L1015 435 L1000 435 L1000 420 L985 420 L985 435 L970 435 Z" stroke-width="3" pathLength="1"></path>
  <rect x="1070" y="430" width="115" height="210" stroke-width="3" pathLength="1"></rect>
  <rect x="1095" y="475" width="65" height="165" stroke-width="3" pathLength="1"></rect>
  <rect x="1105" y="490" width="18" height="32" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1132" y="490" width="18" height="32" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1105" y="545" width="18" height="32" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1132" y="545" width="18" height="32" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1105" y="600" width="18" height="25" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1132" y="600" width="18" height="25" stroke-width="1.8" pathLength="1"></rect>
  <rect x="1185" y="385" width="95" height="255" stroke-width="3" pathLength="1"></rect>
  <path d="M1180 385 L1285 385 L1285 360 L1275 360 L1275 335 L1260 335 L1260 360 L1245 360 L1245 335 L1230 335 L1230 360 L1215 360 L1215 335 L1200 335 L1200 360 L1190 360 Z" stroke-width="3" pathLength="1"></path>
  <path d="M1205 415 Q1215 405 1225 415 L1225 443 L1205 443 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M1235 415 Q1245 405 1255 415 L1255 443 L1235 443 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M1205 470 Q1215 460 1225 470 L1225 498 L1205 498 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M1235 470 Q1245 460 1255 470 L1255 498 L1235 498 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M1205 525 Q1215 515 1225 525 L1225 553 L1205 553 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M1235 525 Q1245 515 1255 525 L1255 553 L1235 553 Z" stroke-width="1.8" pathLength="1"></path>
  <path d="M440 455 L455 455 L455 445 L470 445 L470 455 L485 455 L485 445 L500 445 L500 455 L515 455 L515 445 L530 445 L530 455" stroke-width="1.8" pathLength="1"></path>
  <path d="M870 455 L885 455 L885 445 L900 445 L900 455 L915 455 L915 445 L930 445 L930 455 L945 455 L945 445 L960 445 L960 455" stroke-width="1.8" pathLength="1"></path>
  <line x1="110" y1="680" x2="1290" y2="680" stroke-width="2.2" pathLength="1"></line>
</symbol>
<symbol id="m-more" viewBox="0 0 400 220" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1">
  <path stroke="none" fill="var(--color-accent-100)" d="M109 154a11 11 0 1 1 22 0c0 7-4 12-11 22c-7-10-11-15-11-22zM273 142a13 13 0 1 1 26 0c0 8-5 15-13 26c-8-11-13-18-13-26z" style="animation:classical-wash 1.1s ease-out 2.1s both"></path>
  <path stroke="none" fill="var(--color-accent-200)" d="M184 118a16 16 0 1 1 32 0c0 10-6 18-16 32c-10-14-16-22-16-32z" style="animation:classical-wash 1.1s ease-out 2.2s both"></path>
  <path fill="none" d="M10 204h380" pathLength="1"></path>
  <path fill="none" d="M24 198h352" pathLength="1"></path>
  <path fill="none" d="M120 176c-7-10-11-15-11-22a11 11 0 1 1 22 0c0 7-4 12-11 22z" pathLength="1"></path>
  <path fill="none" d="M116 154a4 4 0 1 1 8 0a4 4 0 1 1-8 0" pathLength="1"></path>
  <path fill="none" d="M200 150c-10-14-16-22-16-32a16 16 0 1 1 32 0c0 10-6 18-16 32z" pathLength="1"></path>
  <path fill="none" d="M194 118a6 6 0 1 1 12 0a6 6 0 1 1-12 0" pathLength="1"></path>
  <path fill="none" d="M286 168c-8-11-13-18-13-26a13 13 0 1 1 26 0c0 8-5 15-13 26z" pathLength="1"></path>
  <path fill="none" d="M281 142a5 5 0 1 1 10 0a5 5 0 1 1-10 0" pathLength="1"></path>
  <path fill="none" d="M110 186h20M186 186h28M275 186h22" pathLength="1"></path>
  <path fill="none" d="M52 192h14M84 192h10M150 192h18M232 192h16M318 192h12M346 192h10" pathLength="1"></path>
</symbol>
<symbol id="ic-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6z"></path></symbol>
<symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"></path></symbol>
<symbol id="ic-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"></rect><path d="M4 6l8 7 8-7"></path></symbol>
<symbol id="ic-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="1.5"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></symbol>
<symbol id="ic-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"></path><circle cx="12" cy="10" r="2.4"></circle></symbol>
<symbol id="ic-case" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="1.5"></rect><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></symbol>
<symbol id="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 1 1-3.3-6.4L21 4l-1 4.4A8 8 0 0 1 21 12z"></path></symbol>
<symbol id="ic-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.5 20h19z"></path><path d="M12 10v4.5"></path><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none"></circle></symbol>
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
