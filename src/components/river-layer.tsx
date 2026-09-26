export function RiverLayer() {
  return <svg className="river-layer" viewBox="0 0 640 360" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="river-tone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a35b91" />
        <stop offset=".35" stopColor="#70447e" />
        <stop offset="1" stopColor="#347399" />
      </linearGradient>
      <linearGradient id="river-shimmer" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ed7e9a" stopOpacity=".05" />
        <stop offset=".48" stopColor="#ffc296" stopOpacity=".72" />
        <stop offset="1" stopColor="#ed7e9a" stopOpacity=".08" />
      </linearGradient>
    </defs>
    <path
      d="M352 261 C371 261 392 263 405 265 L410 269 C397 271 374 271 358 274 C346 277 367 278 387 281 C371 284 342 285 325 287 C311 290 342 292 357 295 C338 298 294 297 267 300 C246 302 252 304 276 306 C247 309 215 309 191 311 C157 312 145 315 160 318 C119 321 64 323 0 328 L0 350 C58 340 110 336 156 334 C193 332 241 326 270 321 C301 316 315 312 303 308 C297 306 291 305 306 303 C342 300 378 299 392 295 C393 291 366 289 367 286 C392 283 414 280 425 275 C426 270 412 267 407 266 Z"
      fill="url(#river-tone)"
      opacity=".93"
    />
    <path d="M351 263 C371 263 388 265 400 267 M350 275 C360 273 384 272 405 271 M327 288 C344 287 367 286 382 284 M269 300 C289 299 315 298 337 298 M190 312 C218 311 245 309 268 307 M70 327 C102 323 136 321 166 320"
      fill="none" stroke="url(#river-shimmer)" strokeWidth="2" strokeLinecap="round" opacity=".8"
    />
    <path d="M1 335 C58 327 102 326 145 323 M27 343 C82 334 126 333 168 330 M173 326 C200 320 226 319 251 317"
      fill="none" stroke="#5688aa" strokeWidth="1.5" strokeLinecap="round" opacity=".35"
    />
  </svg>;
}
