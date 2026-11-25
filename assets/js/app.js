(function () {
  var schools = Array.isArray(window.MADARIS_SCHOOLS) ? window.MADARIS_SCHOOLS : [];
  var STORAGE_KEY = 'madaris_saved_schools_v1';

  var state = {
    search: '',
    region: 'all',
    jenjang: 'all',
    kategori: 'all',
    kecamatan: 'all',
    sistem: 'all',
    sort: 'featured',
    savedOnly: false,
    savedIds: loadSavedIds()
  };

  var els = {
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    heroSearchForm: document.getElementById('heroSearchForm'),
    quickPills: document.querySelectorAll('[data-quick-jenjang]'),
    regionTabs: document.querySelectorAll('[data-region]'),
    filterJenjang: document.getElementById('filterJenjang'),
    filterKategori: document.getElementById('filterKategori'),
    filterKecamatan: document.getElementById('filterKecamatan'),
    filterSistem: document.getElementById('filterSistem'),
    sortSelect: document.getElementById('sortSelect'),
    savedOnlyCheckbox: document.getElementById('savedOnlyCheckbox'),
    toggleSavedNav: document.getElementById('toggleSavedNav'),
    savedCountBadge: document.getElementById('savedCountBadge'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),
    schoolsGrid: document.getElementById('schoolsGrid'),
    emptyState: document.getElementById('emptyState'),
    visibleCount: document.getElementById('visibleCount'),
    totalCountText: document.getElementById('totalCountText'),
    activeFilterLabel: document.getElementById('activeFilterLabel'),
    districtSummaryGrid: document.getElementById('districtSummaryGrid'),
    detailModal: document.getElementById('detailModal'),
    detailModalBody: document.getElementById('detailModalBody'),
    closeDetailModal: document.getElementById('closeDetailModal')
  };

  function loadSavedIds() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function persistSavedIds() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.savedIds));
    } catch (e) {
      // Ignore storage quota or private mode issues
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getInitials(name) {
    var clean = String(name || '')
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim();
    var parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'M';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function renderAvatarHtml(school) {
    var initials = escapeHtml(getInitials(school.name));
    if (school.logoUrl) {
      return (
        '<div class="school-avatar">' +
        '<img src="' + escapeHtml(school.logoUrl) + '" alt="Logo ' + escapeHtml(school.name) + '" loading="lazy" ' +
        'onerror="this.parentNode.textContent=\'' + initials + '\';" />' +
        '</div>'
      );
    }
    return '<div class="school-avatar">' + initials + '</div>';
  }

  function getCategoryStyle(category) {
    if (category === 'Ikhwan') {
      return { badgeClass: 'badge-ikhwan', bannerClass: 'banner-ikhwan', label: 'Khusus Ikhwan' };
    }
    if (category === 'Akhwat') {
      return { badgeClass: 'badge-akhwat', bannerClass: 'banner-akhwat', label: 'Khusus Akhwat' };
    }
    return { badgeClass: 'badge-both', bannerClass: 'banner-both', label: 'Ikhwan & Akhwat' };
  }

  function populateHeaderStats() {
    var kotaCount = schools.filter(function (s) { return s.region === 'Kota Bandung'; }).length;
    var kabCount = schools.filter(function (s) { return s.region === 'Kabupaten Bandung'; }).length;
    var kbbCount = schools.filter(function (s) { return s.region === 'Kabupaten Bandung Barat'; }).length;
    var districtSet = {};
    schools.forEach(function (s) {
      districtSet[s.district + '|' + s.region] = true;
    });

    document.getElementById('statTotalSchools').textContent = schools.length;
    document.getElementById('statKotaBandung').textContent = kotaCount;
    document.getElementById('statBandungRaya').textContent = kabCount + kbbCount;
    document.getElementById('statDistricts').textContent = Object.keys(districtSet).length;

    document.getElementById('countAll').textContent = schools.length;
    document.getElementById('countKota').textContent = kotaCount;
    document.getElementById('countKab').textContent = kabCount;
    document.getElementById('countKbb').textContent = kbbCount;
    els.totalCountText.textContent = schools.length;
  }

  function populateDistrictSelect() {
    var source = state.region === 'all'
      ? schools
      : schools.filter(function (s) { return s.region === state.region; });

    var districts = [];
    var seen = {};
    source.forEach(function (s) {
      if (!seen[s.district]) {
        seen[s.district] = true;
        districts.push(s.district);
      }
    });
    districts.sort(function (a, b) { return a.localeCompare(b, 'id'); });

    var current = state.kecamatan;
    var html = '<option value="all">Semua Kecamatan</option>';
    districts.forEach(function (d) {
      html += '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + '</option>';
    });
    els.filterKecamatan.innerHTML = html;

    if (current !== 'all' && seen[current]) {
      els.filterKecamatan.value = current;
    } else {
      state.kecamatan = 'all';
      els.filterKecamatan.value = 'all';
    }
  }

  function populateDistrictSummary() {
    var map = {};
    schools.forEach(function (s) {
      var key = s.district + '||' + s.region;
      if (!map[key]) {
        map[key] = { district: s.district, region: s.region, count: 0 };
      }
      map[key].count += 1;
    });

    var items = Object.keys(map).map(function (k) { return map[k]; });
    items.sort(function (a, b) {
      if (a.region === 'Kota Bandung' && b.region !== 'Kota Bandung') return -1;
      if (a.region !== 'Kota Bandung' && b.region === 'Kota Bandung') return 1;
      return b.count - a.count || a.district.localeCompare(b.district, 'id');
    });

    els.districtSummaryGrid.innerHTML = items.map(function (item) {
      var shortRegion = item.region === 'Kota Bandung' ? 'Kota' : (item.region === 'Kabupaten Bandung' ? 'Kab.' : 'KBB');
      return (
        '<button type="button" class="district-chip" data-pick-district="' + escapeHtml(item.district) + '" data-pick-region="' + escapeHtml(item.region) + '">' +
        escapeHtml(item.district) + ' (' + shortRegion + ')' +
        '<span>' + item.count + '</span>' +
        '</button>'
      );
    }).join('');

    els.districtSummaryGrid.querySelectorAll('[data-pick-district]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.region = btn.getAttribute('data-pick-region');
        state.kecamatan = btn.getAttribute('data-pick-district');
        syncRegionTabs();
        populateDistrictSelect();
        els.filterKecamatan.value = state.kecamatan;
        renderSchools();
        document.getElementById('direktori').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  function getFilteredSchools() {
    var q = state.search.trim().toLowerCase();
    var filtered = schools.filter(function (s) {
      if (state.region !== 'all' && s.region !== state.region) return false;
      if (state.jenjang !== 'all' && s.levels.indexOf(state.jenjang) === -1) return false;
      if (state.kategori !== 'all' && s.category !== state.kategori) return false;
      if (state.kecamatan !== 'all' && s.district !== state.kecamatan) return false;
      if (state.sistem !== 'all' && s.system !== state.sistem) return false;
      if (state.savedOnly && state.savedIds.indexOf(s.id) === -1) return false;

      if (q) {
        var haystack = [
          s.name,
          s.foundation,
          s.pembina,
          s.levelLabel,
          s.district,
          s.region,
          s.address,
          s.notes
        ].join(' ').toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }

      return true;
    });

    filtered.sort(function (a, b) {
      if (state.sort === 'name-asc') return a.name.localeCompare(b.name, 'id');
      if (state.sort === 'name-desc') return b.name.localeCompare(a.name, 'id');
      if (state.sort === 'district') {
        return a.district.localeCompare(b.district, 'id') || a.name.localeCompare(b.name, 'id');
      }
      // featured: Kota Bandung first, then Kabupaten Bandung, then KBB
      var rank = { 'Kota Bandung': 0, 'Kabupaten Bandung': 1, 'Kabupaten Bandung Barat': 2 };
      var diff = (rank[a.region] || 9) - (rank[b.region] || 9);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'id');
    });

    return filtered;
  }

  function renderSavedBadge() {
    els.savedCountBadge.textContent = state.savedIds.length;
    els.toggleSavedNav.setAttribute('aria-pressed', state.savedOnly ? 'true' : 'false');
    els.savedOnlyCheckbox.checked = state.savedOnly;
  }

  function syncRegionTabs() {
    els.regionTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-region') === state.region;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function syncQuickPills() {
    els.quickPills.forEach(function (pill) {
      var active = pill.getAttribute('data-quick-jenjang') === state.jenjang;
      pill.classList.toggle('is-active', active);
    });
  }

  function renderActiveFilterSummary() {
    var parts = [];
    if (state.region !== 'all') parts.push(state.region);
    if (state.jenjang !== 'all') parts.push('Jenjang ' + state.jenjang);
    if (state.kategori !== 'all') parts.push(state.kategori);
    if (state.kecamatan !== 'all') parts.push('Kec. ' + state.kecamatan);
    if (state.sistem !== 'all') parts.push(state.sistem);
    if (state.savedOnly) parts.push('Tersimpan');
    if (state.search.trim()) parts.push('"' + state.search.trim() + '"');

    els.activeFilterLabel.textContent = parts.length ? '· Filter: ' + parts.join(' • ') : '';
  }

  function renderSchools() {
    var list = getFilteredSchools();
    els.visibleCount.textContent = list.length;
    renderActiveFilterSummary();
    renderSavedBadge();

    if (list.length === 0) {
      els.schoolsGrid.innerHTML = '';
      els.emptyState.hidden = false;
      return;
    }

    els.emptyState.hidden = true;

    els.schoolsGrid.innerHTML = list.map(function (school) {
      var cat = getCategoryStyle(school.category);
      var isSaved = state.savedIds.indexOf(school.id) !== -1;

      return (
        '<article class="school-card">' +
          '<div class="card-banner ' + cat.bannerClass + '">' +
            renderAvatarHtml(school) +
            '<div class="card-banner-meta">' +
              '<span class="card-region-pill">' + escapeHtml(school.region) + '</span>' +
              '<div class="card-level-text" title="' + escapeHtml(school.levelLabel) + '">' + escapeHtml(school.levelLabel) + '</div>' +
            '</div>' +
            '<button type="button" class="bookmark-btn ' + (isSaved ? 'is-saved' : '') + '" ' +
              'data-toggle-save="' + escapeHtml(school.id) + '" ' +
              'aria-label="' + (isSaved ? 'Hapus dari simpanan' : 'Simpan sekolah') + '" ' +
              'title="' + (isSaved ? 'Hapus dari simpanan' : 'Simpan sekolah') + '">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (isSaved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<div class="card-body">' +
            '<div>' +
              '<h3 class="card-title">' + escapeHtml(school.name) + '</h3>' +
              (school.foundation ? '<p class="card-foundation">' + escapeHtml(school.foundation) + '</p>' : '') +
            '</div>' +
            '<div class="card-badges">' +
              '<span class="badge ' + cat.badgeClass + '">' + escapeHtml(cat.label) + '</span>' +
              '<span class="badge badge-system">' + escapeHtml(school.systemLabel) + '</span>' +
            '</div>' +
            '<div class="card-location">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
                '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>' +
                '<circle cx="12" cy="10" r="3"></circle>' +
              '</svg>' +
              '<div>' +
                '<strong>Kec. ' + escapeHtml(school.district) + '</strong>' +
                '<div class="card-address-text">' + escapeHtml(school.address) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="card-footer">' +
            '<button type="button" class="card-btn card-btn-detail" data-open-detail="' + escapeHtml(school.id) + '">Detail</button>' +
            '<a class="card-btn card-btn-maps" href="' + escapeHtml(school.mapsUrl) + '" target="_blank" rel="noopener noreferrer">Maps</a>' +
            (school.whatsappUrl
              ? '<a class="card-btn card-btn-wa" href="' + escapeHtml(school.whatsappUrl) + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>'
              : '') +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function toggleSave(id) {
    var idx = state.savedIds.indexOf(id);
    if (idx === -1) {
      state.savedIds.push(id);
    } else {
      state.savedIds.splice(idx, 1);
    }
    persistSavedIds();
    renderSchools();
  }

  function openDetailModal(schoolId) {
    var school = schools.find(function (s) { return s.id === schoolId; });
    if (!school) return;

    var cat = getCategoryStyle(school.category);
    var isSaved = state.savedIds.indexOf(school.id) !== -1;

    var linkButtons = [];
    linkButtons.push(
      '<a class="btn btn-midnight btn-sm" href="' + escapeHtml(school.mapsUrl) + '" target="_blank" rel="noopener noreferrer">Buka Google Maps</a>'
    );
    if (school.whatsappUrl) {
      linkButtons.push(
        '<a class="btn btn-moss btn-sm" href="' + escapeHtml(school.whatsappUrl) + '" target="_blank" rel="noopener noreferrer">Chat WhatsApp (' + escapeHtml(school.whatsapp) + ')</a>'
      );
    }
    if (school.website) {
      linkButtons.push(
        '<a class="btn btn-outline btn-sm" href="' + escapeHtml(school.website) + '" target="_blank" rel="noopener noreferrer">Website Resmi</a>'
      );
    }
    if (school.instagram) {
      linkButtons.push(
        '<a class="btn btn-outline btn-sm" href="' + escapeHtml(school.instagram) + '" target="_blank" rel="noopener noreferrer">Instagram (' + escapeHtml(school.instagramHandle || 'Profil') + ')</a>'
      );
    }
    if (school.youtube) {
      linkButtons.push(
        '<a class="btn btn-outline btn-sm" href="' + escapeHtml(school.youtube) + '" target="_blank" rel="noopener noreferrer">YouTube</a>'
      );
    }

    els.detailModalBody.innerHTML =
      '<div class="modal-detail-header">' +
        renderAvatarHtml(school) +
        '<div>' +
          '<span class="card-region-pill">' + escapeHtml(school.region) + ' · Kec. ' + escapeHtml(school.district) + '</span>' +
          '<h2 id="modalSchoolName">' + escapeHtml(school.name) + '</h2>' +
          (school.foundation ? '<p class="modal-foundation">' + escapeHtml(school.foundation) + '</p>' : '') +
        '</div>' +
      '</div>' +
      '<div class="modal-detail-content">' +
        '<div class="detail-grid">' +
          '<div class="detail-item">' +
            '<span class="detail-label">Jenjang Pendidikan</span>' +
            '<span class="detail-value">' + escapeHtml(school.levelLabel) + '</span>' +
          '</div>' +
          '<div class="detail-item">' +
            '<span class="detail-label">Kategori Siswa</span>' +
            '<span class="detail-value"><span class="badge ' + cat.badgeClass + '">' + escapeHtml(school.categoryDetail || cat.label) + '</span></span>' +
          '</div>' +
          '<div class="detail-item">' +
            '<span class="detail-label">Sistem Belajar</span>' +
            '<span class="detail-value">' + escapeHtml(school.systemLabel) + '</span>' +
          '</div>' +
          '<div class="detail-item">' +
            '<span class="detail-label">Kontak Resmi</span>' +
            '<span class="detail-value">' + escapeHtml(school.whatsapp || '-') + (school.email ? ' · ' + escapeHtml(school.email) : '') + '</span>' +
          '</div>' +
          (school.pembina
            ? '<div class="detail-item full-width">' +
                '<span class="detail-label">Pembina</span>' +
                '<span class="detail-value">' + escapeHtml(school.pembina) + '</span>' +
              '</div>'
            : '') +
          '<div class="detail-item full-width">' +
            '<span class="detail-label">Alamat Lengkap</span>' +
            '<span class="detail-value">' + escapeHtml(school.address) + '</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<span class="detail-label">Tautan &amp; Kontak Langsung</span>' +
          '<div class="detail-links">' + linkButtons.join('') + '</div>' +
        '</div>' +
        (school.notes
          ? '<div class="modal-note-box"><strong>Catatan:</strong> ' + escapeHtml(school.notes) + '</div>'
          : '') +
        '<div class="modal-bottom-row">' +
          '<button type="button" class="btn btn-outline btn-sm" id="modalToggleSaveBtn">' +
            (isSaved ? 'Hapus dari Simpanan' : 'Simpan Sekolah Ini') +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('modalToggleSaveBtn').addEventListener('click', function () {
      toggleSave(school.id);
      openDetailModal(school.id);
    });

    els.detailModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalEl) {
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  function resetAllFilters() {
    state.search = '';
    state.region = 'all';
    state.jenjang = 'all';
    state.kategori = 'all';
    state.kecamatan = 'all';
    state.sistem = 'all';
    state.sort = 'featured';
    state.savedOnly = false;

    els.searchInput.value = '';
    els.clearSearchBtn.hidden = true;
    els.filterJenjang.value = 'all';
    els.filterKategori.value = 'all';
    els.filterSistem.value = 'all';
    els.sortSelect.value = 'featured';
    syncRegionTabs();
    syncQuickPills();
    populateDistrictSelect();
    renderSchools();
  }

  function bindEvents() {
    els.heroSearchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      state.search = els.searchInput.value;
      renderSchools();
      document.getElementById('direktori').scrollIntoView({ behavior: 'smooth' });
    });

    els.searchInput.addEventListener('input', function () {
      state.search = els.searchInput.value;
      els.clearSearchBtn.hidden = state.search.length === 0;
      renderSchools();
    });

    els.clearSearchBtn.addEventListener('click', function () {
      state.search = '';
      els.searchInput.value = '';
      els.clearSearchBtn.hidden = true;
      renderSchools();
      els.searchInput.focus();
    });

    els.quickPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        state.jenjang = pill.getAttribute('data-quick-jenjang');
        els.filterJenjang.value = state.jenjang;
        syncQuickPills();
        renderSchools();
      });
    });

    els.regionTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.region = tab.getAttribute('data-region');
        syncRegionTabs();
        populateDistrictSelect();
        renderSchools();
      });
    });

    document.querySelectorAll('[data-footer-region]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.region = btn.getAttribute('data-footer-region');
        syncRegionTabs();
        populateDistrictSelect();
        renderSchools();
        document.getElementById('direktori').scrollIntoView({ behavior: 'smooth' });
      });
    });

    els.filterJenjang.addEventListener('change', function () {
      state.jenjang = els.filterJenjang.value;
      syncQuickPills();
      renderSchools();
    });

    els.filterKategori.addEventListener('change', function () {
      state.kategori = els.filterKategori.value;
      renderSchools();
    });

    els.filterKecamatan.addEventListener('change', function () {
      state.kecamatan = els.filterKecamatan.value;
      renderSchools();
    });

    els.filterSistem.addEventListener('change', function () {
      state.sistem = els.filterSistem.value;
      renderSchools();
    });

    els.sortSelect.addEventListener('change', function () {
      state.sort = els.sortSelect.value;
      renderSchools();
    });

    els.savedOnlyCheckbox.addEventListener('change', function () {
      state.savedOnly = els.savedOnlyCheckbox.checked;
      renderSchools();
    });

    els.toggleSavedNav.addEventListener('click', function () {
      state.savedOnly = !state.savedOnly;
      renderSchools();
      document.getElementById('direktori').scrollIntoView({ behavior: 'smooth' });
    });

    els.resetFiltersBtn.addEventListener('click', resetAllFilters);
    els.emptyResetBtn.addEventListener('click', resetAllFilters);

    els.schoolsGrid.addEventListener('click', function (e) {
      var saveBtn = e.target.closest('[data-toggle-save]');
      if (saveBtn) {
        toggleSave(saveBtn.getAttribute('data-toggle-save'));
        return;
      }

      var detailBtn = e.target.closest('[data-open-detail]');
      if (detailBtn) {
        openDetailModal(detailBtn.getAttribute('data-open-detail'));
      }
    });

    els.closeDetailModal.addEventListener('click', function () { closeModal(els.detailModal); });

    els.detailModal.addEventListener('click', function (e) {
      if (e.target === els.detailModal) closeModal(els.detailModal);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.detailModal.hidden) {
        closeModal(els.detailModal);
      }
    });
  }

  function init() {
    populateHeaderStats();
    populateDistrictSelect();
    populateDistrictSummary();
    bindEvents();
    renderSchools();
  }

  init();
})();
