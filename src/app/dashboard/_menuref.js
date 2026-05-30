  const userMenuRef = useRef(null);
  const userMenuBtnRef = useRef(null);
  const userMenuMobileBtnRef = useRef(null);

  function getUserMenuPos() {
    const btn = userMenuBtnRef.current || userMenuMobileBtnRef.current;
    if (!btn) return { top: 72, right: 16 };
    const r = btn.getBoundingClientRect();
    return { top: r.bottom + 8, right: window.innerWidth - r.right };
  }