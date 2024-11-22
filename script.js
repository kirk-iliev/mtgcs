// CONSTANTS AND VARIABLES ----------------------------------------------------------------
const searchForm = document.getElementById("searchForm");
const searchInputElement = document.getElementById("searchInput");
const cardInfoContainer = document.getElementById("cardInfoContainer");
const cardImage = document.getElementById("cardImage");
const setGridContainer = document.getElementById('setGridContainer');
const setGridView = document.getElementById('setGridView');
const browseBySetLink = document.getElementById('browseBySetLink');
const browseByCardLink = document.getElementById('browseByCardLink');
let bounds; // To store card boundaries for 3D effect calculations
let isSetSearch = false; // Tracks the current mode

// EVENT LISTENERS -------------------------------------------------------------------------

$(document).ready(function () {
    // Initialize Select2 for card search (default)
    initializeCardSearch();

    // Event listener for "Browse by Set" link
    $('#browseBySetLink').on('click', function (e) {
        e.preventDefault();
        isSetSearch = true;
        $('#searchInput').val(null).trigger('change'); // Clear current selection
        $('#searchInput').select2('destroy'); // Destroy the current instance
        initializeSetSearch(); // Reinitialize Select2 for sets
        $('#browseBySetLink').hide(); // Hide "Browse by Set" link
        $('#browseByCardLink').show(); // Show "Browse by Card" link
        $('#cardInfo').hide(); // Hide card info
        $('#setGridView').hide(); // Hide grid view if previously visible
    });

    // Event listener for "Browse by Card" link
    $('#browseByCardLink').on('click', function (e) {
        e.preventDefault();
        isSetSearch = false;
        $('#searchInput').val(null).trigger('change'); // Clear current selection
        $('#searchInput').select2('destroy'); // Destroy the current instance
        initializeCardSearch(); // Reinitialize Select2 for cards
        $('#browseBySetLink').show(); // Show "Browse by Set" link
        $('#browseByCardLink').hide(); // Hide "Browse by Card" link
        $('#setGridView').hide(); // Hide the grid view
        $('#cardInfo').hide(); // Hide card info
        $('#setTitleHeader').text(''); // Clear set title
    });

    // Event listener for Select2 dropdown open
    $(document).on('select2:open', () => {
        document.querySelector('.select2-search__field').focus(); // Focus on the search input when dropdown opens
    });

    // Add event listener to handle form submission
    $('#searchForm').on('submit', function (e) {
        e.preventDefault(); // Prevent form submission
        const cardName = $('#searchInput').val().trim(); // Get user input
        if (cardName && !isSetSearch) {
            searchCard(cardName); // Trigger the search
        }
    });
});

// FUNCTIONS ----------------------------------------------------------------------------------

function initializeCardSearch() {
    $('#searchInput').select2({
        placeholder: "Enter card name",
        minimumInputLength: 1,
        ajax: {
            url: function (params) {
                return "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(params.term);
            },
            dataType: 'json',
            delay: 15,
            processResults: function (data) {
                return {
                    results: data.data.map(suggestion => ({
                        id: suggestion,
                        text: suggestion
                    }))
                };
            },
            cache: true
        }
    });

    // Remove previous event handlers to prevent multiple bindings
    $('#searchInput').off('select2:select');

    // Event handler for when a card is selected
    $('#searchInput').on('select2:select', function (e) {
        var cardName = e.params.data.text;
        searchCard(cardName);
    });
}

function initializeSetSearch() {
    $('#searchInput').select2({
        placeholder: "Enter set name",
        minimumInputLength: 1,
        ajax: {
            url: function () {
                return "https://api.scryfall.com/sets";
            },
            dataType: 'json',
            delay: 15,
            data: function () {
                return {}; // No additional parameters needed
            },
            processResults: function (data, params) {
                const searchTerm = params.term ? params.term.toLowerCase() : '';
                const filteredSets = data.data.filter(set => set.name.toLowerCase().includes(searchTerm));
                return {
                    results: filteredSets.map(set => ({
                        id: set.code, // Use set code for fetching cards later
                        text: set.name
                    }))
                };
            },
            cache: true
        }
    });

    // Remove previous event handlers to prevent multiple bindings
    $('#searchInput').off('select2:select');

    // Event handler for when a set is selected
    $('#searchInput').on('select2:select', function (e) {
        var setCode = e.params.data.id;
        var setName = e.params.data.text; // Get the set name
        fetchSetCards(setCode, setName);
    });
}

function fetchSetCards(setCode, setName) {
    const apiUrl = `https://api.scryfall.com/cards/search?q=set:${setCode}&order=set`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                displaySetTitle(setName); // Display the set title
                displayCardGrid(data.data); // Pass cards to the grid renderer
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
    setGridContainer.innerHTML = ''; // Clear previous grid content

    cards.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card-grid-item');

        // Get the image URL
        let imageUrl = '';
        if (card.image_uris) {
            imageUrl = card.image_uris.normal;
        } else if (card.card_faces && card.card_faces[0].image_uris) {
            imageUrl = card.card_faces[0].image_uris.normal;
        } else {
            imageUrl = ''; // Placeholder image or leave blank
        }

        cardDiv.innerHTML = `
            <img src="${imageUrl}" alt="${card.name}">
            <p>${card.name}</p>
        `;
        setGridContainer.appendChild(cardDiv);

        const pElement = cardDiv.querySelector('p');
        pElement.style.textShadow = '  0 2px 5px rgba(0, 0, 0, 0.9)';

        // Add click functionality for card details
        cardDiv.addEventListener('click', () => {
            displayCardInfo(card, true); // Pass 'true' to indicate it's from the set grid
            displayCardImage(imageUrl); // Display card image

            // Set the background image to the card's art
            if (card.image_uris && card.image_uris.art_crop) {
                setBodyBackground(card.image_uris.art_crop);
            } else if (card.card_faces && card.card_faces[0].image_uris && card.card_faces[0].image_uris.art_crop) {
                setBodyBackground(card.card_faces[0].image_uris.art_crop);
            } else {
                // Optionally set a default background or leave as is
                console.warn('Art crop not available for this card.');
            }

            $('#cardInfo').show(); // Show card info
            // Do not hide the set grid view
            // Scroll to the card info section
            $('html, body').animate({
                scrollTop: $("#cardInfo").offset().top - 200
            }, 500);
        });
    });

    setGridView.style.display = 'block'; // Show the grid view
    $('#cardInfo').hide(); // Hide card info when displaying grid
}

// Function to search for a card by name
function searchCard(cardName) {
    let apiUrl = "https://api.scryfall.com/cards/named?fuzzy=" + encodeURIComponent(cardName);

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.image_uris && data.image_uris.art_crop) {
                setBodyBackground(data.image_uris.art_crop); // Set background image of body
                displayCardInfo(data); // Display card information
                displayCardImage(data.image_uris.png); // Display card image
                $('#cardInfo').show(); // Show the card info
                document.getElementById("view-art-btn").style.display = "block";
            } else {
                displayErrorMessage("Art crop image not found");
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            displayErrorMessage("Error fetching card data");
        });
}

// Function to set background image of the body
function setBodyBackground(imageUrl) {
    document.getElementById("backgroundContainer").style.backgroundImage = `url("${imageUrl}")`;
}

// Function to display card image
function displayCardImage(imageUrl) {
    cardImage.src = imageUrl; // Set the src attribute dynamically
    cardImage.dataset.magnifySrc = imageUrl; // Update the data-magnify-src attribute
    cardImage.onload = function() {
        applyMagnifyPlugin(); // Call the function to apply the Magnify plugin after the image is loaded
    };
}

// Function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to display card information
function displayCardInfo(data, fromSetGrid = false) {
    cardInfoContainer.innerHTML = ""; // Clear previous content
    const table = document.createElement("table");
    table.id = "cardInfoTable";
    const tbody = document.createElement("tbody");

    // Add rows and data to the table
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
            td.style.color = getRarityColor(row.value); // Set text color based on rarity
            td.classList.add("shiny-text");
            td.style.background = "black";
        }
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    cardInfoContainer.appendChild(table);
}

// Function to get color based on rarity
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

// Function to get current prices
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

// Function to display error message
function displayErrorMessage(message) {
    cardImage.innerHTML = `<p>${message}</p>`;
}

// Function to enable the 3D hover effect
function rotateToPointer(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX; // Handle mouse or touch
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Get position relative to the card
    const leftX = clientX - bounds.left;
    const topY = clientY - bounds.top;

    const center = {
        x: leftX - bounds.width / 2,
        y: topY - bounds.height / 2,
    };

    // Apply 3D transform
    cardImage.style.transform = `
        perspective(1000px)
        rotateX(${-(center.y / bounds.height) * 40}deg)
        rotateY(${(center.x / bounds.width) * 40}deg)
        scale3d(1.5, 1.5, 1.5)
    `;

    // Prevent scrolling while interacting with the card
    if (e.type === 'touchmove') {
        e.preventDefault();
    }
}

// Function to reset the card's transform
function resetCard() {
    cardImage.style.transform = ''; // Reset transform to default
}

// Event handlers to enable and disable the effect
function enableEffect(e) {
    bounds = cardImage.getBoundingClientRect(); // Get accurate dimensions of the image

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
    resetCard(); // Reset the card when the effect is disabled
}

cardImage.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

// Add event listeners for both mouse and touch
cardImage.addEventListener('mouseenter', enableEffect);
cardImage.addEventListener('mouseleave', disableEffect);
cardImage.addEventListener('touchstart', enableEffect, { passive: false });
cardImage.addEventListener('touchend', disableEffect, { passive: false });

document.addEventListener('DOMContentLoaded', () => {
    const viewArtButton = document.getElementById('view-art-btn'); // Button to trigger modal
    const modal = document.getElementById('artModal'); // Modal container
    const modalArtImage = document.getElementById('modalArtImage'); // Image in the modal
    const closeModal = document.getElementById('closeModal'); // Close button

    // Show the modal with the card art
    viewArtButton.addEventListener('click', async () => {
        const cardName = document.getElementById('searchInput').value.trim(); // Get the card name from the input
        if (!cardName) {
            alert("Please select a card first.");
            return;
        }

        try {
            const apiUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.image_uris && data.image_uris.art_crop) {
                const cardArtImage = data.image_uris.art_crop; // Get card art URL
                modalArtImage.src = cardArtImage; // Set the visible image to card art
                modalArtImage.setAttribute('data-magnify-src', cardArtImage); // Set zoomed-in image to card art
                modal.style.display = 'flex'; // Show the modal
            } else {
                alert("Art not available for this card.");
            }
        } catch (error) {
            console.error("Error fetching card art:", error);
            alert("Failed to load card art. Please try again.");
        }
    });

    // Initialize magnify on hover or touch
    modalArtImage.addEventListener('mouseenter', () => {
        if (!$(modalArtImage).data('magnify-initialized')) {
            applyMagnifyPlugin();
        }
    });

    modalArtImage.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent default touch behavior (like scrolling)
        if (!$(modalArtImage).data('magnify-initialized')) {
            applyMagnifyPlugin();
        }
    });

    // Close the modal when the close button is clicked
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        destroyMagnify(); // Disable magnify effect
    });

    // Close the modal when clicking outside of the modal content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            destroyMagnify(); // Disable magnify effect
        }
    });

    // Function to apply the Magnify plugin for image zoom
    function applyMagnifyPlugin() {
        const viewportWidth = window.innerWidth;
        const zoomWidth = viewportWidth > 1200 ? 4000 : 2500; // Dynamically adjust zoom based on viewport
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

        $(modalArtImage).data('magnify-initialized', true); // Mark as initialized
    }

    // Function to destroy the Magnify plugin
    function destroyMagnify() {
        $(".zoom").trigger('destroy.magnify'); // Destroy the magnify instance
        $(modalArtImage).data('magnify-initialized', false); // Reset initialization status
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const disclaimerContainer = document.getElementById('disclaimerContainer');
    const disclaimerPopup = document.querySelector('.disclaimer-popup');

    // Toggle the visibility of the popup on tap
    disclaimerContainer.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent this event from bubbling up
        const isVisible = disclaimerPopup.style.display === 'block';
        disclaimerPopup.style.display = isVisible ? 'none' : 'block';
    });

    // Close the popup when clicking outside of it
    document.addEventListener('click', () => {
        disclaimerPopup.style.display = 'none';
    });
});
