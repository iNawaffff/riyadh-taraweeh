document.addEventListener('DOMContentLoaded', function() {
    // getting all the important HTML elements
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const areaFilter = document.getElementById('areaFilter');
    const mosquesGrid = document.getElementById('mosquesGrid');
    const searchResults = document.getElementById('searchResults');
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    //keeping track of the currently playing audio
    let currentlyPlaying = null;

    // the show/hide mobile menu when the menu button is clicked
    menuToggle.addEventListener('click', function() {
        if (mobileMenu.style.display === 'block') {
            mobileMenu.style.display = 'none';
        } else {
            mobileMenu.style.display = 'block';
        }
    });


    fetchMosques();

    // starts the search when search button is clicked
    searchButton.addEventListener('click', function() {
        searchMosques();
    });

    // same but for key inputs
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchMosques();
        }
    });


    areaFilter.addEventListener('change', function() {
        searchMosques();
    });

    //fetches mosque data from the server
    function fetchMosques() {
        fetch('/api/mosques')
            .then(response => response.json())
            .then(data => {
                renderMosques(data);
            })
            .catch(error => {
                console.error('Error fetching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة لاحقاً.</div>';
            });
    }


    function searchMosques() {
        const query = searchInput.value.trim();
        const area = areaFilter.value;

        // Show loading message while searching(for interactivity)
        mosquesGrid.innerHTML = '<div class="loading">جاري البحث...</div>';

        fetch(`/api/mosques/search?q=${encodeURIComponent(query)}&area=${encodeURIComponent(area)}`)
            .then(response => response.json())
            .then(data => {
                renderMosques(data);
                updateSearchResults(data.length, query, area);
            })
            .catch(error => {
                console.error('Error searching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء البحث. الرجاء المحاولة لاحقاً.</div>';
            });
    }

    //shows how many results were found and add a reset button
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
                    searchMosques();
                });
            }
        } else {
            searchResults.innerHTML = '';
        }
    }


    function renderMosques(mosques) {
        // Show message if no mosques found
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
                searchMosques();
            });

            return;
        }


        mosquesGrid.innerHTML = '';

        // Create a card for each mosque
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
                
                <a href="${mosque.map_link}" target="_blank" class="info-row location-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${mosque.location}</p>
                    </div>
                    <span class="map-link">فتح في قوقل ماب</span>
                </a>
            `;

            mosquesGrid.appendChild(mosqueCard);
        });

        //making the audio buttons work
        const audioButtons = document.querySelectorAll('.audio-button');
        audioButtons.forEach(button => {
            button.addEventListener('click', function() {
                const audioSrc = this.getAttribute('data-audio');
                const mosqueId = this.getAttribute('data-id');

                if (currentlyPlaying) {
                    //stop currently playing audio
                    currentlyPlaying.audio.pause();
                    currentlyPlaying.button.innerHTML = '<i class="fas fa-play"></i> استماع';
                    currentlyPlaying.button.classList.remove('playing');

                    // If clicking same button again, just stop playing
                    if (currentlyPlaying.id === mosqueId) {
                        currentlyPlaying = null;
                        return;
                    }
                }

                //fix audio file path if needed(for any random bug)
                let audioPath = audioSrc;
                if (!audioPath.startsWith('/static/') && !audioPath.startsWith('http')) {
                    audioPath = `/static/audio/${audioPath.split('/').pop()}`;
                }
                const audio = new Audio(audioPath);

                //Play the audio and update button
                audio.play();
                this.innerHTML = '<i class="fas fa-pause"></i> إيقاف';
                this.classList.add('playing');

                //keeping track of what's playing
                currentlyPlaying = {
                    id: mosqueId,
                    audio: audio,
                    button: this
                };

                //when audio finishes playing
                audio.onended = function() {
                    button.innerHTML = '<i class="fas fa-play"></i> استماع';
                    button.classList.remove('playing');
                    currentlyPlaying = null;
                };

                // Handle audio loading errors
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

    // Set today's date in Hijri calendar
    const lastUpdateElement = document.getElementById('lastUpdateDate');
    if (lastUpdateElement) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        lastUpdateElement.textContent = today.toLocaleDateString('ar-SA', options);
    }
});