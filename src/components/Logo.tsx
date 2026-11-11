export function Logo() {
    return (
        <svg viewBox="0 0 110 110" aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7">
            <rect x="7" y="7" width="96" height="96" rx="12" className="fill-foreground" />
            <path d="M37 34 H28 V76 H37 M73 34 H82 V76 H73" fill="none" strokeWidth="8" className="stroke-background" />
            <path d="M48 42 L66 55 L48 68 Z" strokeWidth="3" strokeLinejoin="round" className="fill-background stroke-background" />
        </svg>
    );
}
