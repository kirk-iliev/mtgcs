// CONSTANTS AND VARIABLES ----------------------------------------------------------------
const searchForm = document.getElementById("searchForm");
const searchInputElement = document.getElementById("searchInput");
const cardInfoContainer = document.getElementById("cardInfoContainer");
const cardImage = document.getElementById("cardImage");
const setGridContainer = document.getElementById('setGridContainer');
const setGridView = document.getElementById('setGridView');
const browseBySetLink = document.getElementById('browseBySetLink');
const browseByCardLink = document.getElementById('browseByCardLink');
const modal = document.getElementById('artModal');
const modalArtImage = document.getElementById('modalArtImage');
const closeModal = document.getElementById('closeModal');
const viewArtButton = document.getElementById("view-art-btn");
let bounds;
let isSetSearch = false;

// EVENT LISTENERS -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    initializeCardSearch();

    browseBySetLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchToSetSearch();
    });

    browseByCardLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchToCardSearch();
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cardName = searchInputElement.value.trim();
        if (cardName && !isSetSearch) {
            searchCard(cardName);
        }
    });

    viewArtButton.addEventListener("click", handleViewArtClick);

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        destroyMagnify();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            destroyMagnify();
        }
    });

    disclaimerContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = disclaimerPopup.style.display === 'block';
        disclaimerPopup.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        disclaimerPopup.style.display = 'none';
    });

    // Add event listeners for both mouse and touch
    cardImage.addEventListener('mouseenter', enableEffect);
    cardImage.addEventListener('mouseleave', disableEffect);
    cardImage.addEventListener('touchstart', enableEffect, { passive: false });
    cardImage.addEventListener('touchend', disableEffect, { passive: false });
    cardImage.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    // Focus on the search input field when Select2 dropdown is opened
    $(document).on('select2:open', () => {
        document.querySelector('.select2-search__field').focus();
    });
});

// FUNCTIONS ----------------------------------------------------------------------------------

function initializeSelect2(placeholder, ajaxUrl, processResults) {
    $('#searchInput').select2({
        placeholder: placeholder,
        minimumInputLength: 1,
        ajax: {
            url: ajaxUrl,
            dataType: 'json',
            delay: 15,
            processResults: processResults,
            cache: true
        }
    });

    $('#searchInput').off('select2:select');
}

function initializeCardSearch() {
    initializeSelect2("Enter card name", (params) => {
        return "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(params.term);
    }, (data) => {
        return {
            results: data.data.map(suggestion => ({
                id: suggestion,
                text: suggestion
            }))
        };
    });

    $('#searchInput').on('select2:select', (e) => {
        var cardName = e.params.data.text;
        searchCard(cardName);
    });
}

function initializeSetSearch() {
    initializeSelect2("Enter set name", () => {
        return "https://api.scryfall.com/sets";
    }, (data, params) => {
        const searchTerm = params.term ? params.term.toLowerCase() : '';
        const filteredSets = data.data.filter(set => set.name.toLowerCase().includes(searchTerm));
        return {
            results: filteredSets.map(set => ({
                id: set.code,
                text: set.name
            }))
        };
    });

    $('#searchInput').on('select2:select', (e) => {
        var setCode = e.params.data.id;
        var setName = e.params.data.text;
        fetchSetCards(setCode, setName);
    });
}

function switchToSetSearch() {
    isSetSearch = true;
    $('#searchInput').val(null).trigger('change');
    $('#searchInput').select2('destroy');
    initializeSetSearch();
    $('#browseBySetLink').hide();
    $('#browseByCardLink').show();
    $('#cardInfo').hide();
    $('#setGridView').hide();
}

function switchToCardSearch() {
    isSetSearch = false;
    $('#searchInput').val(null).trigger('change');
    $('#searchInput').select2('destroy');
    initializeCardSearch();
    $('#browseBySetLink').show();
    $('#browseByCardLink').hide();
    $('#setGridView').hide();
    $('#cardInfo').hide();
    $('#setTitleHeader').text('');
}

function handleViewArtClick() {
    const cardName = searchInputElement.value.trim();
    if (!cardName) {
        alert("Please select a card first.");
        return;
    }

    fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`)
        .then(response => response.json())
        .then(data => {
            if (data.image_uris && data.image_uris.art_crop) {
                displayCardArtModal(data.image_uris.art_crop);
            } else {
                alert("Art not available for this card.");
            }
        })
        .catch(error => {
            console.error("Error fetching card art:", error);
            alert("Failed to load card art. Please try again.");
        });
}

function applyMagnifyPlugin() {
    const viewportWidth = window.innerWidth;
    const zoomWidth = viewportWidth > 1200 ? 4000 : 2500;
    const aspectRatio = modalArtImage.naturalHeight / modalArtImage.naturalWidth;

    $(".zoom").magnify({
        magnifiedWidth: zoomWidth,
        magnifiedHeight: zoomWidth * aspectRatio,
        onMagnifedOpen: function () {
            document.body.classList.add('magnify-active');
        },
        onMagnifiedClose: function () {
            document.body.classList.remove('magnify-active');
        },
    });

    $(modalArtImage).data('magnify-initialized', true);
}

function displayCardArtModal(cardArtUrl) {
    if (!cardArtUrl) {
        alert("No art available for this card.");
        return;
    }

    modalArtImage.src = cardArtUrl;
    modalArtImage.setAttribute('data-magnify-src', cardArtUrl);
    modal.style.display = 'flex';

    modalArtImage.onload = function () {
        if (typeof applyMagnifyPlugin === 'function') {
            applyMagnifyPlugin();
        } else {
            console.warn("applyMagnifyPlugin is missing.");
        }
    };
}

function destroyMagnify() {
    $(".zoom").trigger('destroy.magnify');
    $(modalArtImage).data('magnify-initialized', false);
}

function fetchSetCards(setCode, setName) {
    const apiUrl = `https://api.scryfall.com/cards/search?q=set:${setCode}&order=set`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                displaySetTitle(setName);
                displayCardGrid(data.data);
            } else {
                console.error("No cards found in this set.");
            }
        })
        .catch(error => {
            console.error('Error fetching cards from set:', error);
        });
}

function displaySetTitle(setName) {
    const setTitleHeader = document.getElementById('setTitleHeader');
    setTitleHeader.textContent = setName;
}

function displayCardGrid(cards) {
    setGridContainer.innerHTML = '';

    cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card-grid-item');

        let imageUrl = '';
        if (card.image_uris) {
            imageUrl = card.image_uris.normal;
        } else if (card.card_faces && card.card_faces[0].image_uris) {
            imageUrl = card.card_faces[0].image_uris.normal;
        }

        cardDiv.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}">
            <p>${card.name}</p>
        `;
        setGridContainer.appendChild(cardDiv);

        const pElement = cardDiv.querySelector('p');
        pElement.style.textShadow = '0 2px 5px rgba(0, 0, 0, 0.9)';

        cardDiv.addEventListener('click', () => {
            displayCardInfo(card, true);
            displayCardImage(imageUrl);

            if (card.image_uris && card.image_uris.art_crop) {
                setBodyBackground(card.image_uris.art_crop);
            } else if (card.card_faces && card.card_faces[0].image_uris && card.card_faces[0].image_uris.art_crop) {
                setBodyBackground(card.card_faces[0].image_uris.art_crop);
            } else {
                console.warn('Art crop not available for this card.');
            }

            $('#cardInfo').show();
            $('html, body').animate({
                scrollTop: $("#cardInfo").offset().top - 200
            }, 500);
        });
    });

    setGridView.style.display = 'block';
    $('#cardInfo').hide();
}

function searchCard(cardName) {
    const apiUrl = "https://api.scryfall.com/cards/named?fuzzy=" + encodeURIComponent(cardName);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.image_uris && data.image_uris.art_crop) {
                setBodyBackground(data.image_uris.art_crop);
                displayCardInfo(data);
                displayCardImage(data.image_uris.png);
                $('#cardInfo').show();
                viewArtButton.style.display = "block";
            } else {
                displayErrorMessage("Art crop image not found");
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            displayErrorMessage("Error fetching card data");
        });
}

function setBodyBackground(imageUrl) {
    document.getElementById("backgroundContainer").style.backgroundImage = `url("${imageUrl}")`;
}

function displayCardImage(imageUrl) {
    cardImage.src = imageUrl;
    cardImage.dataset.magnifySrc = imageUrl;
    cardImage.onload = function() {
        applyMagnifyPlugin();
    };
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function displayCardInfo(data, fromSetGrid = false) {
    cardInfoContainer.innerHTML = "";
    const table = document.createElement("table");
    table.id = "cardInfoTable";
    const tbody = document.createElement("tbody");

    const rows = [
        { label: "Card Name:", value: data.name || "-" },
        { label: "Set:", value: data.set_name || "-" },
        { label: "Rarity:", value: capitalizeFirstLetter(data.rarity) || "-" },
        { label: "Number in Set:", value: "#" + data.collector_number || "-" },
        { label: "Artist:", value: data.artist || "-" },
        { label: "Release Date:", value: data.released_at || "-" },
        { label: "Keywords:", value: data.keywords.join(', ') || "-" },
        { label: "Current Prices:", value: getCurrentPrices(data) }
    ];

    rows.forEach(row => {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        const td = document.createElement("td");
        th.textContent = row.label;
        th.style.textShadow = "2px 2px black";
        td.textContent = row.value;
        if (row.label === "Rarity") {
            td.style.color = getRarityColor(row.value);
            td.classList.add("shiny-text");
            td.style.background = "black";
        }
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    cardInfoContainer.appendChild(table);

    viewArtButton.style.display = "block";
    viewArtButton.removeEventListener("click", handleViewArtClick);
    viewArtButton.addEventListener("click", () => {
        if (data.image_uris && data.image_uris.art_crop) {
            displayCardArtModal(data.image_uris.art_crop);
        } else {
            alert("Art not available for this card.");
        }
    });
}

function getRarityColor(rarity) {
    switch (rarity.toLowerCase()) {
        case "common":
            return "white";
        case "uncommon":
            return "#7294b6";
        case "rare":
            return "gold";
        case "mythic":
            return "orangered";
        default:
            return "white";
    }
}

function getCurrentPrices(data) {
    if (data.prices) {
        let prices = "";
        if (data.prices.usd) {
            prices += "$" + data.prices.usd + " // ";
        }
        if (data.prices.eur) {
            prices += "€" + data.prices.eur + " ";
        }
        return prices.trim() || "-";
    } else {
        return "-";
    }
}

function displayErrorMessage(message) {
    cardImage.innerHTML = `<p>${message}</p>`;
}

let isThrottled = false;

function rotateToPointer(e) {
    if (isThrottled) return;
    isThrottled = true;

    requestAnimationFrame(() => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const leftX = clientX - bounds.left;
        const topY = clientY - bounds.top;

        const center = {
            x: leftX - bounds.width / 2,
            y: topY - bounds.height / 2,
        };

        cardImage.style.transform = `
            perspective(1000px)
            rotateX(${-(center.y / bounds.height) * 50}deg)
            rotateY(${(center.x / bounds.width) * 50}deg)
            scale3d(1.35, 1.35, 1.35)
        `;

        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        isThrottled = false;
    });
}

function resetCard() {
    cardImage.style.transform = '';
}

function enableEffect(e) {
    bounds = cardImage.getBoundingClientRect();

    if (e.type === 'mouseenter') {
        document.addEventListener('mousemove', rotateToPointer);
    } else if (e.type === 'touchstart') {
        document.addEventListener('touchmove', rotateToPointer, { passive: false });
    }
}

function disableEffect(e) {
    if (e.type === 'mouseleave') {
        document.removeEventListener('mousemove', rotateToPointer);
    } else if (e.type === 'touchend') {
        document.removeEventListener('touchmove', rotateToPointer);
    }
    resetCard();
}