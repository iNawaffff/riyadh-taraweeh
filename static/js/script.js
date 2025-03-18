document.addEventListener('DOMContentLoaded', function() {
    // ========== ELEMENT SELECTORS ==========
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const clearButton = document.getElementById('clearSearch');
    const areaFilter = document.getElementById('areaFilter');
    const mosquesGrid = document.getElementById('mosquesGrid');
    const searchResults = document.getElementById('searchResults');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const searchBox = document.querySelector('.search-box');
    const proximityButton = document.getElementById('proximitySort');

    // track currently playing audio and search timeout
    let currentlyPlaying = null;
    let searchTimeout = null;

    // ========== NAVIGATION MENU HANDLING ==========

    // menu handling - toggle when hamburger is clicked
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            toggleMenu();
        });
    }

    // close menu when clicked anywhere in the menu background
    if (navMenu) {
        navMenu.addEventListener('click', function(event) {
            // only close if clicking the menu background (not the links)
            if (event.target === navMenu) {
                closeMenu();
            }
        });
    }

    // esc key closes menu
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });

    // toggle menu open/closed
    function toggleMenu() {
        if (menuToggle && navMenu) {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        }
    }

    // close menu
    function closeMenu() {
        if (menuToggle && navMenu) {
            menuToggle.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
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

    // Handle search input changes with debounce
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Show/hide clear button based on input content
            if (this.value.length > 0 && clearButton) {
                clearButton.style.display = 'flex';

                // Implement debounced search (for a smoother experience)
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchMosques();
                }, 500); // 500ms delay
            } else if (clearButton) {
                clearButton.style.display = 'none';

                // If search is cleared, reset to show all mosques
                if (areaFilter && areaFilter.value === 'الكل') {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        fetchMosques();
                    }, 100);
                } else {
                    searchMosques();
                }
            }
        });
    }

    // search when button is clicked
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            clearTimeout(searchTimeout);
            searchMosques();
        });
    }

    // handle clear button
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                clearButton.style.display = 'none';
                searchInput.focus();

                // reset search if area filter is also set to all
                if (areaFilter && areaFilter.value === 'الكل') {
                    fetchMosques();
                } else {
                    searchMosques();
                }
            }
        });
    }

    // search on enter key
    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                clearTimeout(searchTimeout);
                searchMosques();
            }
        });
    }

    // search when filter changes
    if (areaFilter) {
        areaFilter.addEventListener('change', function() {
            searchMosques();
        });
    }

    // ========== API INTERACTIONS ==========

    // fetch all mosques from api
    function fetchMosques() {
        // Show the loading state
        if (!mosquesGrid) return;

        if (searchBox) searchBox.classList.add('searching');
        mosquesGrid.innerHTML = '<div class="loading">جاري تحميل البيانات...</div>';

        fetch('/api/mosques')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setTimeout(() => {
                    renderMosques(data);
                    if (searchBox) searchBox.classList.remove('searching');
                }, 300);
            })
            .catch(error => {
                console.error('Error fetching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء تحميل البيانات. الرجاء المحاولة لاحقاً.</div>';
                if (searchBox) searchBox.classList.remove('searching');
            });
    }

    // search for mosques with filter
    function searchMosques() {
        if (!mosquesGrid || !searchInput || !areaFilter) return;

        const query = searchInput.value.trim();
        const area = areaFilter.value;

        if (searchBox) searchBox.classList.add('searching');

        // show loading message
        mosquesGrid.innerHTML = '<div class="loading">جاري البحث...</div>';

        fetch(`/api/mosques/search?q=${encodeURIComponent(query)}&area=${encodeURIComponent(area)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // small delay to show the animation (feels more responsive)
                setTimeout(() => {
                    renderMosques(data);
                    updateSearchResults(data.length, query, area);
                    if (searchBox) searchBox.classList.remove('searching');
                }, 300);
            })
            .catch(error => {
                console.error('Error searching mosques:', error);
                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء البحث. الرجاء المحاولة لاحقاً.</div>';
                if (searchBox) searchBox.classList.remove('searching');
            });
    }

    // ========== UI RENDERING ==========

    // show search result count and reset button
    function updateSearchResults(count, query, area) {
        if (!searchResults) return;

        if (query || area !== 'الكل') {
            searchResults.innerHTML = `
                <p>تم العثور على ${count} مسجد</p>
                ${(query || area !== 'الكل') ? 
                    `<button id="resetSearch" class="reset-button">مسح البحث ✕</button>` : ''}
            `;

            const resetButton = document.getElementById('resetSearch');
            if (resetButton && searchInput && areaFilter && clearButton) {
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
        if (!mosquesGrid) return;

        // Reset proximity-sorted class if present
        mosquesGrid.classList.remove('proximity-sorted');

        // show empty state if no results
        if (mosques.length === 0) {
            mosquesGrid.innerHTML = `
                <div class="empty-state">
                    <p>لم يتم العثور على مساجد مطابقة للبحث</p>
                    <button id="resetSearchEmpty" class="reset-button">إعادة ضبط البحث</button>
                </div>
            `;

            const resetButton = document.getElementById('resetSearchEmpty');
            if (resetButton && searchInput && areaFilter && clearButton) {
                resetButton.addEventListener('click', function() {
                    searchInput.value = '';
                    areaFilter.value = 'الكل';
                    clearButton.style.display = 'none';
                    searchMosques();
                });
            }

            return;
        }

        mosquesGrid.innerHTML = '';

        // Create schema.org structured data
        let schemaData = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": []
        };

        // create card for each mosque
        mosques.forEach((mosque, index) => {
            const mosqueCard = document.createElement('div');
            mosqueCard.className = 'mosque-card';

            // Handle potential undefined values safely
            const imamName = mosque.imam || 'غير محدد';
            const audioSample = mosque.audio_sample || '';
            const youtubeLink = mosque.youtube_link || '';
            const mapLink = mosque.map_link || '#';

            mosqueCard.innerHTML = `
                <h2 class="mosque-name">
                    <a href="/mosque/${mosque.id}" style="text-decoration: none; color: inherit;">${mosque.name}</a>
                </h2>
                
                <div class="info-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${imamName}</p>
                    </div>
                    <div class="action-buttons">
                        ${audioSample ? `
                            <button class="action-button audio-button" data-audio="${audioSample}" data-id="${mosque.id}">
                                <i class="fas fa-play"></i> <span class="button-text">استماع</span>
                            </button>
                        ` : ''}
                        ${youtubeLink ? `
                            <a href="${youtubeLink}" target="_blank" rel="noopener" class="youtube-button" aria-label="يوتيوب">
                                <i class="fab fa-youtube"></i> 
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                <div class="info-row location-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${mosque.location}</p>
                    </div>
                    ${mapLink !== '#' ? `
                    <a href="${mapLink}" target="_blank" rel="noopener" class="action-button map-link">
                        <i class="fas fa-directions"></i> <span class="button-text">فتح في قوقل ماب</span>
                    </a>
                    ` : ''}
                </div>
            `;

            mosquesGrid.appendChild(mosqueCard);

            // Add this mosque to the schema data
            schemaData.itemListElement.push({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "PlaceOfWorship",
                    "name": mosque.name,
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "الرياض",
                        "addressRegion": mosque.area || "الرياض"
                    },
                    "description": `مسجد ${mosque.name} - إمام التراويح: ${imamName}`,
                    "geo": mosque.latitude && mosque.longitude ? {
                        "@type": "GeoCoordinates",
                        "latitude": mosque.latitude,
                        "longitude": mosque.longitude
                    } : undefined
                }
            });
        });

        // Add schema data to page
        const existingSchema = document.querySelector('script[type="application/ld+json"]');
        if (existingSchema) {
            existingSchema.remove();
        }

        const schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.innerHTML = JSON.stringify(schemaData);
        document.head.appendChild(schemaScript);

        // setup audio buttons
        setupAudioButtons();
    }

    // ========== ENHANCED PROXIMITY SORTING ==========

    // Render mosques with improved distance display
    function renderMosquesWithDistance(mosques) {
        if (!mosquesGrid) return;

        // Empty state handling
        if (mosques.length === 0) {
            mosquesGrid.innerHTML = `
                <div class="empty-state">
                    <p>لم يتم العثور على مساجد مطابقة للبحث</p>
                    <button id="resetSearchEmpty" class="reset-button">إعادة ضبط البحث</button>
                </div>
            `;

            const resetButton = document.getElementById('resetSearchEmpty');
            if (resetButton && searchInput && areaFilter && clearButton) {
                resetButton.addEventListener('click', function() {
                    searchInput.value = '';
                    areaFilter.value = 'الكل';
                    clearButton.style.display = 'none';
                    searchMosques();
                });
            }

            return;
        }

        mosquesGrid.innerHTML = '';
        mosquesGrid.classList.add('proximity-sorted');

        let schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": []
        };

        // create card for each mosque
        mosques.forEach((mosque, index) => {
            const mosqueCard = document.createElement('div');
            mosqueCard.className = 'mosque-card';
            mosqueCard.setAttribute('data-distance', mosque.distance || '999999');

            // Handle potential undefined values safely
            const imamName = mosque.imam || 'غير محدد';
            const audioSample = mosque.audio_sample || '';
            const youtubeLink = mosque.youtube_link || '';
            const mapLink = mosque.map_link || '#';

            let distanceText = '';
            let distanceIcon = 'fa-map-marker-alt'; // Default icon
            let distanceClass = '';

            if (mosque.distance !== undefined) {
                // the appropriate icon and class based on distance
                if (mosque.distance < 1) {
                    distanceIcon = 'fa-walking';
                    distanceClass = 'distance-walking';
                } else if (mosque.distance < 5) {
                    distanceIcon = 'fa-bicycle';
                    distanceClass = 'distance-bicycle';
                } else {
                    distanceIcon = 'fa-car';
                    distanceClass = 'distance-car';
                }

                //format distance text
                if (mosque.distance < 1) {
                    // less than 1 km, show in meters
                    let meters = Math.round(mosque.distance * 1000);
                    distanceText = `<span class="distance-badge ${distanceClass}"><i class="fas ${distanceIcon}"></i> ${meters} م</span>`;
                } else {
                    // more than 1 km
                    distanceText = `<span class="distance-badge ${distanceClass}"><i class="fas ${distanceIcon}"></i> ${mosque.distance.toFixed(1)} كم</span>`;
                }
            }

            //mosque card with better layout
            mosqueCard.innerHTML = `
                <div class="mosque-header">
                    <h2 class="mosque-name">
                        <a href="/mosque/${mosque.id}" style="text-decoration: none; color: inherit;">${mosque.name}</a>
                    </h2>
                    ${distanceText}
                </div>
                
                <div class="info-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${imamName}</p>
                    </div>
                    <div class="action-buttons">
                        ${audioSample ? `
                            <button class="action-button audio-button" data-audio="${audioSample}" data-id="${mosque.id}">
                                <i class="fas fa-play"></i> <span class="button-text">استماع</span>
                            </button>
                        ` : ''}
                        ${youtubeLink ? `
                            <a href="${youtubeLink}" target="_blank" rel="noopener" class="youtube-button" aria-label="يوتيوب">
                                <i class="fab fa-youtube"></i> 
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                <div class="info-row location-row">
                    <div class="info-label">
                        <span class="info-icon"></span>
                        <p>${mosque.location}</p>
                    </div>
                    ${mapLink !== '#' ? `
                    <a href="${mapLink}" target="_blank" rel="noopener" class="action-button map-link">
                        <i class="fas fa-directions"></i> <span class="button-text">فتح في قوقل ماب</span>
                    </a>
                    ` : ''}
                </div>
            `;

            mosquesGrid.appendChild(mosqueCard);

            // Schema data for SEO
            schemaData.itemListElement.push({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "PlaceOfWorship",
                    "name": mosque.name,
                    "address": {
                        "@type": "PostalAddress",
                        "addressLocality": "الرياض",
                        "addressRegion": mosque.area || "الرياض"
                    },
                    "description": `مسجد ${mosque.name} - إمام التراويح: ${imamName}`,
                    "geo": mosque.latitude && mosque.longitude ? {
                        "@type": "GeoCoordinates",
                        "latitude": mosque.latitude,
                        "longitude": mosque.longitude
                    } : undefined
                }
            });
        });

        // Add schema data to page
        const existingSchema = document.querySelector('script[type="application/ld+json"]');
        if (existingSchema) {
            existingSchema.remove();
        }

        const schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        schemaScript.innerHTML = JSON.stringify(schemaData);
        document.head.appendChild(schemaScript);

        setupAudioButtons();

        // Scroll to the top of results
        mosquesGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Improved proximity sorting with better UX
    function setupProximitySorting() {
        if (!proximityButton) return;

        // Check if geolocation is available
        if (!('geolocation' in navigator)) {
            proximityButton.disabled = true;
            proximityButton.title = 'خدمة تحديد الموقع غير متوفرة في متصفحك';
            return;
        }

        // Create permission modal if it doesn't exist yet
        if (!document.querySelector('.location-permission-modal')) {
            const permissionModal = document.createElement('div');
            permissionModal.className = 'location-permission-modal';
            permissionModal.innerHTML = `
                <div class="permission-content">
                    <div class="permission-illustration">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <h3>السماح بتحديد موقعك</h3>
                    <p>لعرض المساجد الأقرب إليك، نحتاج إلى إذن للوصول إلى موقعك الحالي. سيتم استخدام هذه المعلومات فقط لترتيب المساجد حسب المسافة.</p>
                    <div class="permission-buttons">
                        <button class="permission-allow">السماح</button>
                        <button class="permission-deny">لاحقاً</button>
                    </div>
                </div>
            `;
            document.body.appendChild(permissionModal);
        }

        const permissionModal = document.querySelector('.location-permission-modal');
        // Create fresh event listeners to avoid duplicates
        const allowButton = permissionModal.querySelector('.permission-allow');
        const denyButton = permissionModal.querySelector('.permission-deny');

        // Create cloned buttons to prevent multiple event handlers
        const newAllowButton = allowButton.cloneNode(true);
        const newDenyButton = denyButton.cloneNode(true);

        // Replace old buttons with clones
        allowButton.parentNode.replaceChild(newAllowButton, allowButton);
        denyButton.parentNode.replaceChild(newDenyButton, denyButton);

        // Function to get position with better error handling
        function getProximity(showPermissionDialog = true) {
            // Check if we've already requested permission before
            const hasRequestedPermission = localStorage.getItem('proximityPermissionRequested');

            if (!hasRequestedPermission && showPermissionDialog) {
                permissionModal.classList.add('active');

                const currentAllowButton = permissionModal.querySelector('.permission-allow');
                const currentDenyButton = permissionModal.querySelector('.permission-deny');

                currentAllowButton.addEventListener('click', function() {
                    permissionModal.classList.remove('active');
                    localStorage.setItem('proximityPermissionRequested', 'true');
                    getLocation();
                });

                currentDenyButton.addEventListener('click', function() {
                    permissionModal.classList.remove('active');
                    localStorage.setItem('proximityPermissionRequested', 'true');
                });

                return;
            }

            getLocation();
        }

        function getLocation() {
            // Show loading state
            proximityButton.classList.add('loading');
            proximityButton.classList.add('active');
            proximityButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تحديد موقعك...';

            // Get user's location with timeout
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;

                    // Update button text
                    proximityButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري البحث عن المساجد القريبة...';

                    //calling the API to get mosques sorted by proximity
                    fetch(`/api/mosques/nearby?lat=${latitude}&lng=${longitude}`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            //success message
                            proximityButton.classList.remove('loading');
                            proximityButton.innerHTML = '<i class="fas fa-check"></i> تم الترتيب حسب الأقرب';

                            // keep the active state to show sorting is active
                            setTimeout(() => {
                                proximityButton.innerHTML = '<i class="fas fa-location-arrow"></i> الأقرب إليك';
                            }, 2000);

                            renderMosquesWithDistance(data);

                            if (searchResults && areaFilter) {
                                updateSearchResults(data.length, '', areaFilter.value);

                                const sortingInfo = document.createElement('div');
                                sortingInfo.className = 'sorting-info';
                                sortingInfo.innerHTML = '<i class="fas fa-info-circle"></i> تم ترتيب المساجد حسب الأقرب إليك';

                                // Only append if it doesn't exist already
                                if (!searchResults.querySelector('.sorting-info')) {
                                    searchResults.appendChild(sortingInfo);
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching nearby mosques:', error);
                            proximityButton.classList.remove('loading');
                            proximityButton.classList.remove('active');
                            proximityButton.innerHTML = '<i class="fas fa-location-arrow"></i> الأقرب إليك';

                            if (mosquesGrid) {
                                mosquesGrid.innerHTML = '<div class="empty-state">حدث خطأ أثناء البحث. الرجاء المحاولة لاحقاً.</div>';
                            }
                        });
                },
                // error callback
                function(error) {
                    proximityButton.classList.remove('loading');
                    proximityButton.classList.remove('active');
                    proximityButton.innerHTML = '<i class="fas fa-location-arrow"></i> الأقرب إليك';

                    let errorMessage = 'تعذر تحديد موقعك. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'يرجى السماح للموقع باستخدام موقعك.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'معلومات الموقع غير متوفرة.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'انتهت مهلة طلب الموقع.';
                            break;
                        default:
                            errorMessage += 'حدث خطأ غير معروف.';
                    }

                    if (mosquesGrid) {
                        mosquesGrid.innerHTML = `<div class="empty-state">
                            <p>${errorMessage}</p>
                            <button id="retryLocation" class="reset-button">إعادة المحاولة</button>
                        </div>`;

                        //retry button functionality
                        const retryButton = document.getElementById('retryLocation');
                        if (retryButton) {
                            retryButton.addEventListener('click', function() {
                                getProximity(false); // Don't show permission dialog again on retry
                            });
                        }
                    }
                },

                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                }
            );
        }

        // Handle button click
        proximityButton.addEventListener('click', function() {
            getProximity();
        });
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

                // play audio and update button with error handling
                audio.play().catch(error => {
                    console.error('Error playing audio:', error);
                    button.innerHTML = '<i class="fas fa-exclamation-circle"></i> خطأ';
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-play"></i> استماع';
                        button.classList.remove('playing');
                    }, 2000);
                    return;
                });

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
        try {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            updateDateElements.forEach(element => {
                if (element) {
                    element.textContent = today.toLocaleDateString('ar-SA', options);
                }
            });
        } catch (error) {
            console.error('Error updating date elements:', error);
        }
    }

    // ========== INITIALIZATION ==========

    // Only initialize mosque-related features if we're on the right page
    if (mosquesGrid) {
        fetchMosques();
        setupProximitySorting();
    }

    // Initialize audio buttons on all pages
    setupAudioButtons();
});