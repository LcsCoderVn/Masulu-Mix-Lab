(function () {
  const AI_API_URL = 'https://masulu-api.vercel.app/api/analyze';
  const originalRunCulinaryAnalysis = typeof window.runCulinaryAnalysis === 'function'
    ? window.runCulinaryAnalysis
    : null;

  function getIngredientsFromUI() {
    const chipContainer = document.getElementById('tagsContainer');
    if (chipContainer && chipContainer.children.length) {
      return Array.from(chipContainer.children)
        .map(node => (node.textContent || '').replace(/✕/g, '').trim())
        .filter(Boolean);
    }

    const input = document.getElementById('ingredientInput');
    if (input && input.value.trim()) {
      return input.value
        .split(/[\n,;]+/)
        .map(value => value.trim())
        .filter(Boolean);
    }

    return [];
  }

  function showAlert(message) {
    const banner = document.getElementById('alertBanner');
    const text = document.getElementById('alertBannerText');
    if (!banner || !text) return;
    text.textContent = message;
    banner.classList.remove('hidden');
    window.clearTimeout(showAlert.timeoutId);
    showAlert.timeoutId = window.setTimeout(() => banner.classList.add('hidden'), 4500);
  }

  function setLoading(isLoading) {
    const loading = document.getElementById('loadingPanel');
    if (!loading) return;
    if (isLoading) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
  }

  async function callGroqProxy(ingredients) {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.details?.error || data?.error || 'AI request failed');
    }

    return data.result || 'Không có phản hồi từ AI.';
  }

  async function runSecureCulinaryAnalysis() {
    const ingredients = getIngredientsFromUI();
    if (!ingredients.length) {
      showAlert('Bạn hãy nhập nguyên liệu trước khi phân tích nhé!');
      return;
    }

    setLoading(true);

    try {
      const resultText = await callGroqProxy(ingredients);

      const dashboard = document.getElementById('resultDashboard');
      const emptyState = document.getElementById('emptyStatePanel');
      if (dashboard) dashboard.classList.remove('hidden');
      if (emptyState) emptyState.classList.add('hidden');

      const titleEl = document.getElementById('resTitle');
      const summaryEl = document.getElementById('resExecutiveSummary');
      const scoreEl = document.getElementById('resCompatibilityScore');
      const formulaEl = document.getElementById('resSampleFormula');

      if (titleEl) titleEl.textContent = 'Phân tích AI';
      if (summaryEl) summaryEl.textContent = resultText;
      if (scoreEl) scoreEl.textContent = '92';
      if (formulaEl) formulaEl.textContent = 'Nguyên liệu: ' + ingredients.join(', ');
    } catch (error) {
      console.error(error);
      showAlert('AI đang chưa sẵn sàng. Hãy thử lại sau.');
      if (originalRunCulinaryAnalysis) {
        return originalRunCulinaryAnalysis.apply(this, arguments);
      }
    } finally {
      setLoading(false);
    }
  }

  function install() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
      analyzeBtn.onclick = function (event) {
        event.preventDefault();
        runSecureCulinaryAnalysis();
      };
    }

    const ingredientInput = document.getElementById('ingredientInput');
    if (ingredientInput) {
      ingredientInput.onkeydown = function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          runSecureCulinaryAnalysis();
        }
      };
    }

    window.runCulinaryAnalysis = runSecureCulinaryAnalysis;
    window.handleInputKeydown = function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSecureCulinaryAnalysis();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
