document.addEventListener('DOMContentLoaded', function() {
    // element selectors
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearch');
    const areaFilter = document.getElementById('areaFilter');
    const mosquesGrid = document.getElementById('mosquesGrid');
    const searchResults = document.getElementById('searchResults');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const searchBox = document.querySelector('.search-box');

    // track currently playing audio and search timeout
    let currentlyPlaying = null;
    let searchTimeout = null;


    // ========== NAVIGATION MENU HANDLING ==========

    // menu handling - toggle when hamburger is clicked
    menuToggle.addEventListener('click', function() {
        toggleMenu();
    });

    // close menu when clicked anywhere in the menu background
    navMenu.addEventListener('click', function(event) {
        // only close if clicking the menu background (not the links)
        if (event.target === navMenu) {
            closeMenu();
        }
    });

    // esc key closes menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });

    // toggle menu open/closed
    function toggleMenu() {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    }

    // close menu
    function closeMenu() {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    // mark current page as active in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });



    // ========== SEARCH FUNCTIONALITY ==========

    // load mosque data on page load
    fetchMosques();

    // Handle search input changes with debounce
    searchInput.addEventListener('input', function() {
        // Show/hide clear button based on input content
        if (this.value.length > 0) {
            clearButton.style.display = 'flex';

            // Implement debounced search (for a smoother experience)
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchMosques();
            }, 500); // 500ms delay
        } else {
            clearButton.style.display = 'none';

            // If search is cleared, reset to show all mosques
            if (areaFilter.value === 'الكل') {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    fetchMosques();
                }, 100);
            } else {
                searchMosques();
            }
        }
    });

    // search when button is clicked
    searchButton.addEventListener('click', function() {
        clearTimeout(searchTimeout);
        searchMosques();
    });

    // handle clear button
    clearButton.addEventListener('click', function() {
        searchInput.value = '';
        clearButton.style.display = 'none';
        searchInput.focus();

        // reset search if area filter is also set to all
        if (areaFilter.value === 'الكل') {
            fetchMosques();
        } else {
            searchMosques();
        }
    });

    // search on enter key
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            clearTimeout(searchTimeout);
            searchMosques();
        }
    });

    // search when filter changes
    areaFilter.addEventListener('change', function() {
        searchMosques();
    });



    // ========== API INTERACTIONS ==========

    // fetch all mosques from api
    function fetchMosques() {
        // Show the loading state
        searchBox.classList.add('searching');
        mosquesGrid.innerHTML = '<div class="loading">جاري تحميل البيانات...</div>';

        fetch('/api/mosques')
            .then(response => response.json())
            .then(data => {
                setTimeout(() => {
                    renderMosques(data);
                    searchBox.classList.remove('searching');
                }, 300);
            })
            .catch(error => {
                console.error('Error fetching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة لاحقاً.</div>';
                searchBox.classList.remove('searching');
            });
    }

    // search for mosques with filter
    function searchMosques() {
        const query = searchInput.value.trim();
        const area = areaFilter.value;


        searchBox.classList.add('searching');

        // show loading message
        mosquesGrid.innerHTML = '<div class="loading">جاري البحث...</div>';

        fetch(`/api/mosques/search?q=${encodeURIComponent(query)}&area=${encodeURIComponent(area)}`)
            .then(response => response.json())
            .then(data => {
                // small delay to show the animation (feels more responsive)
                setTimeout(() => {
                    renderMosques(data);
                    updateSearchResults(data.length, query, area);
                    searchBox.classList.remove('searching');
                }, 300);
            })
            .catch(error => {
                console.error('Error searching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء البحث. الرجاء المحاولة لاحقاً.</div>';
                searchBox.classList.remove('searching');
            });
    }


    // ========== UI RENDERING ==========

    // show search result count and reset button
    function updateSearchResults(count, query, area) {
        if (query || area !== 'الكل') {
            searchResults.innerHTML = `
                <p>تم العثور على ${count} مسجد</p>
                ${(query || area !== 'الكل') ? 
                    `<button id="resetSearch" class="reset-button">مسح البحث ✕</button>` : ''}
            `;

            const resetButton = document.getElementById('resetSearch');
            if (resetButton) {
                resetButton.addEventListener('click', function() {
                    searchInput.value = '';
                    areaFilter.value = 'الكل';
                    clearButton.style.display = 'none';
                    searchMosques();
                });
            }
        } else {
            searchResults.innerHTML = '';
        }
    }

    // render mosque cards to page
    function renderMosques(mosques) {
        // show empty state if no results
        if (mosques.length === 0) {
            mosquesGrid.innerHTML = `
                <div class="empty-state">
                    <p>لم يتم العثور على مساجد مطابقة للبحث</p>
                    <button id="resetSearchEmpty" class="reset-button">إعادة ضبط البحث</button>
                </div>
            `;

            const resetButton = document.getElementById('resetSearchEmpty');
            resetButton.addEventListener('click', function() {
                searchInput.value = '';
                areaFilter.value = 'الكل';
                clearButton.style.display = 'none';
                searchMosques();
            });

            return;
        }

        mosquesGrid.innerHTML = '';

        // create card for each mosque
        mosques.forEach(mosque => {
            const mosqueCard = document.createElement('div');
            mosqueCard.className = 'mosque-card';
            mosqueCard.innerHTML = `
                <h2 class="mosque-name">${mosque.name}</h2>
                
                <div class="info-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${mosque.imam || 'غير محدد'}</p>
                    </div>
                    ${mosque.audio_sample ? `
                        <button class="audio-button" data-audio="${mosque.audio_sample}" data-id="${mosque.id}">
                            <i class="fas fa-play"></i> استماع
                        </button>
                    ` : ''}
                    ${mosque.youtube_link ? `
                        <a href="${mosque.youtube_link}" target="_blank" class="youtube-button">
                            <i class="fab fa-youtube"></i> يوتيوب
                        </a>
                    ` : ''}
                </div>
                
                  <div class="info-row location-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${mosque.location}</p>
                    </div>
                    <a href="${mosque.map_link}" target="_blank" class="map-link">
                        <i class="fas fa-directions"></i>
                        فتح في قوقل ماب
                    </a>
                </div>
            `;

            mosquesGrid.appendChild(mosqueCard);
        });

        // setup audio buttons
        setupAudioButtons();
    }

    // ========== AUDIO PLAYBACK ==========

    // handle audio button clicks
    function setupAudioButtons() {
        const audioButtons = document.querySelectorAll('.audio-button');
        audioButtons.forEach(button => {
            button.addEventListener('click', function() {
                const audioSrc = this.getAttribute('data-audio');
                const mosqueId = this.getAttribute('data-id');

                if (currentlyPlaying) {
                    // stop currently playing audio
                    currentlyPlaying.audio.pause();
                    currentlyPlaying.button.innerHTML = '<i class="fas fa-play"></i> استماع';
                    currentlyPlaying.button.classList.remove('playing');

                    // if clicking same button again, just stop playing
                    if (currentlyPlaying.id === mosqueId) {
                        currentlyPlaying = null;
                        return;
                    }
                }

                // fix audio path if needed
                let audioPath = audioSrc;
                if (!audioPath.startsWith('/static/') && !audioPath.startsWith('http')) {
                    audioPath = `/static/audio/${audioPath.split('/').pop()}`;
                }
                const audio = new Audio(audioPath);

                // play audio and update button
                audio.play();
                this.innerHTML = '<i class="fas fa-pause"></i> إيقاف';
                this.classList.add('playing');

                // track what's playing
                currentlyPlaying = {
                    id: mosqueId,
                    audio: audio,
                    button: this
                };

                // when audio finishes
                audio.onended = function() {
                    button.innerHTML = '<i class="fas fa-play"></i> استماع';
                    button.classList.remove('playing');
                    currentlyPlaying = null;
                };

                // handle errors
                audio.onerror = function() {
                    button.innerHTML = '<i class="fas fa-exclamation-circle"></i> خطأ';
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-play"></i> استماع';
                        button.classList.remove('playing');
                    }, 2000);
                    currentlyPlaying = null;
                };
            });
        });
    }


    // ========== DATE FORMATTING ==========

    // set today's date in hijri calendar
    const updateDateElements = document.querySelectorAll('#lastUpdateDate, #mainPageLastUpdate');
    if (updateDateElements.length > 0) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        updateDateElements.forEach(element => {
            element.textContent = today.toLocaleDateString('ar-SA', options);
        });
    }
});