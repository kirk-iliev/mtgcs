const searchForm = document.getElementById("searchForm"); // Reference to the search form element
const searchInput = document.getElementById("searchInput"); // Reference to the search input element
const suggestionDropdown = document.getElementById("suggestionDropdown"); // Reference to the suggestion dropdown element
const cardInfoContainer = document.getElementById("cardInfoContainer"); // Reference to the card info container element
const cardImage = document.getElementById("cardImage"); // Reference to the card image element
const effectToggle = document.getElementById('effectToggle'); // Toggle dropdown
let bounds; // To store card boundaries for 3D effect calculations

// EVENT LISTENERS -------------------------------------------------------------------------

// jQuery document ready function to initialize Select2 plugin
$(document).ready(function() {
    
    // Initialize Select2 plugin for search input
    $('#searchInput').select2({
        placeholder: "Enter card name",
        minimumInputLength: 1,
        ajax: {
            // URL for fetching autocomplete suggestions
            url: function(params) {
                return "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(params.term);
            },
            dataType: 'json',
            delay: 15,
            // Process results from autocomplete API
            processResults: function(data) {
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

    // Event handler for when a suggestion is selected
    $('#searchInput').on('select2:select', function(e) {
        var cardName = e.params.data.text;
        searchCard(cardName);
    });
});

// Event listener for Select2 dropdown open
$(document).on('select2:open', () => {
    document.querySelector('.select2-search__field').focus(); // Focus on the search input when dropdown opens
});

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm'); // Reference to the search form
    const searchInput = document.getElementById('searchInput'); // Reference to the search input

    // Add event listener to handle form submission
    searchForm.addEventListener('submit', function (e) {
        //e.preventDefault(); // Prevent form submission
        //e.stopPropagation();
        const cardName = $('#searchInput').val().trim(); // Get user input
        if (cardName) {
            searchCard(cardName); // Trigger the search
        }
    });

    searchButton.addEventListener('click', function (e) {
        e.preventDefault();
        const cardName = $('#searchInput').val().trim(); // Use select2's method
        console.log('Input value:', cardName); // Debug the input value
        if (cardName) {
            searchCard(cardName);
        } else {
            console.log('No input value provided.');
        }
    });
});

// FUNCTIONS ----------------------------------------------------------------------------------

// Function to update the selected option in the suggestion dropdown
function updateSelectedOption() {
    for (let i = 0; i < suggestionDropdown.options.length; i++) {
        suggestionDropdown.options[i].selected = (i === selectedIndex);
    }
}

// Function to fetch autocomplete suggestions
function getSuggestions(inputValue) {
    let apiUrl = "https://api.scryfall.com/cards/autocomplete?q=" + encodeURIComponent(inputValue);
    
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        populateDropdown(data.data); // Populate suggestion dropdown with fetched data
    })
    .catch(error => {
        console.error('Error fetching suggestions:', error);
    });
}

// Function to clear suggestions from the dropdown
function clearSuggestions() {
    suggestionDropdown.innerHTML = "";
    suggestionDropdown.style.display = "none";
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
function displayCardInfo(data) {
    cardInfoContainer.innerHTML = ""; // Clear previous content
    const table = document.createElement("table");
    table.id = "cardInfoTable";
    const tbody = document.createElement("tbody");
    
    // Add rows and data to the table
    const rows = [
        { label: "Card Name", value: data.name || "-"},
        { label: "Set", value: data.set_name || "-" },
        { label: "Rarity", value: capitalizeFirstLetter(data.rarity) || "-" },
        { label: "Number in Set", value: "#" + data.collector_number || "-" },
        { label: "Artist", value: data.artist || "-" },
        { label: "Release Date", value: data.released_at || "-" },
        { label: "Keywords", value: data.keywords || "-"},
        { label: "Current Prices", value: getCurrentPrices(data) }
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

// Function to position the suggestion dropdown
function positionDropdown() {
    const searchContainer = document.getElementById("searchContainer");
    suggestionDropdown.style.left = searchContainer.offsetLeft + "px";
    suggestionDropdown.style.top = (searchContainer.offsetTop + searchContainer.offsetHeight) + "px";
    suggestionDropdown.style.width = get

ComputedStyle(searchContainer).width; // Get computed width of search bar
}

// // Function to apply the Magnify plugin for image zoom
// function applyMagnifyPlugin() {
//     $(".zoom").magnify({
//         magnifiedWidth: 2000, // Adjust the magnifiedWidth option to increase zoom level horizontally
//         magnifiedHeight: 2800,
//         onMagnifedOpen: function() {
//             document.body.classList.add('magnify-active'); // Add magnify-active class to body
//         },
//         onMagnifiedClose: function() {
//             document.body.classList.remove('magnify-active'); // Remove magnify-active class from body
//         }
//     });
// }


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
        document.addEventListener('touchmove', rotateToPointer, { passive: true });
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
cardImage.addEventListener('touchend', disableEffect, { passive: true });


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







