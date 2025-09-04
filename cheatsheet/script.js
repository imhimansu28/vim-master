/**
 * Simple Neovim Cheatsheet Application
 * Table-based layout with Alpine.js
 * Author: Himanshu
 * Version: 2.0.0
 */

// Wait for Alpine.js to be available
document.addEventListener('alpine:init', () => {
    Alpine.data('cheatsheetApp', () => ({
        // ========================================================================
        // State Management
        // ========================================================================

        // Application state
        loading: true,
        error: null,
        cheatsheet: {},

        // Filter and search state
        searchQuery: '',
        selectedCategory: '',

        // ========================================================================
        // Lifecycle Methods
        // ========================================================================

        /**
         * Initialize the application
         */
        async init() {
            console.log('🚀 Initializing Neovim Cheatsheet App...');

            try {
                this.loading = true;
                this.error = null;

                // Load cheatsheet data
                await this.loadCheatsheet();

                // Setup keyboard shortcuts
                this.setupKeyboardShortcuts();

                console.log('✅ App initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize app:', error);
                this.error = error.message || 'Failed to load cheatsheet data';
            } finally {
                this.loading = false;
            }
        },

        // ========================================================================
        // Data Loading
        // ========================================================================

        /**
         * Load cheatsheet data from JSON file
         */
        async loadCheatsheet() {
            try {
                const response = await fetch('./cheatsheet.json');

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Validate data structure
                if (!data.metadata || !data.categories || !data.items) {
                    throw new Error('Invalid cheatsheet data structure');
                }

                this.cheatsheet = data;
                console.log(`📊 Loaded ${data.items.length} cheatsheet items`);

            } catch (error) {
                console.error('Failed to load cheatsheet:', error);
                throw new Error(`Failed to load cheatsheet: ${error.message}`);
            }
        },

        // ========================================================================
        // Category and Content Methods
        // ========================================================================

        /**
         * Check if category has settings items
         */
        hasSettingsInCategory(categoryId) {
            if (!this.cheatsheet.items) return false;
            return this.cheatsheet.items.some(item =>
                item.category === categoryId &&
                item.content?.settings
            );
        },

        /**
         * Check if category has keybindings items
         */
        hasKeybindingsInCategory(categoryId) {
            if (!this.cheatsheet.items) return false;
            return this.cheatsheet.items.some(item =>
                item.category === categoryId &&
                item.content?.keybindings
            );
        },

        /**
         * Get settings items for a category
         */
        getSettingsForCategory(categoryId) {
            if (!this.cheatsheet.items) return [];
            return this.cheatsheet.items.filter(item =>
                item.category === categoryId &&
                item.content?.settings
            );
        },

        /**
         * Get keybindings items for a category
         */
        getKeybindingsForCategory(categoryId) {
            if (!this.cheatsheet.items) return [];
            return this.cheatsheet.items.filter(item =>
                item.category === categoryId &&
                item.content?.keybindings
            );
        },

        // ========================================================================
        // Search and Filter Methods
        // ========================================================================

        /**
         * Check if item/setting/keybinding matches search query
         */
        matchesSearch(item, contentItem) {
            if (!this.searchQuery.trim()) return true;

            const query = this.searchQuery.toLowerCase().trim();

            // Search in item properties
            const itemMatches =
                item.title.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
                item.keywords?.some(keyword => keyword.toLowerCase().includes(query));

            if (itemMatches) return true;

            // Search in content item (setting or keybinding)
            if (contentItem.setting) {
                // Settings search
                return contentItem.setting.toLowerCase().includes(query) ||
                    contentItem.value.toLowerCase().includes(query) ||
                    contentItem.description.toLowerCase().includes(query);
            } else if (contentItem.keys) {
                // Keybindings search
                return contentItem.keys.toLowerCase().includes(query) ||
                    contentItem.action.toLowerCase().includes(query) ||
                    contentItem.description.toLowerCase().includes(query) ||
                    contentItem.mode.toLowerCase().includes(query);
            }

            return false;
        },

        /**
         * Clear all active filters
         */
        clearFilters() {
            this.searchQuery = '';
            this.selectedCategory = '';
        },

        // ========================================================================
        // UI Interaction Methods
        // ========================================================================

        /**
         * Copy text to clipboard with visual feedback
         */
        async copyToClipboard(text, element) {
            try {
                await navigator.clipboard.writeText(text);

                // Visual feedback
                if (element) {
                    const originalClass = element.className;
                    element.className = originalClass + ' copy-flash';

                    setTimeout(() => {
                        element.className = originalClass;
                    }, 500);
                }

                console.log('📋 Copied to clipboard:', text);
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                // Fallback for older browsers
                this.fallbackCopyToClipboard(text);
            }
        },

        /**
         * Fallback clipboard copy for older browsers
         */
        fallbackCopyToClipboard(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                document.execCommand('copy');
                console.log('📋 Copied to clipboard (fallback):', text);
            } catch (error) {
                console.error('Fallback copy failed:', error);
            }

            document.body.removeChild(textArea);
        },

        /**
         * Scroll to top of page
         */
        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        },

        // ========================================================================
        // Keyboard Shortcuts
        // ========================================================================

        /**
         * Setup global keyboard shortcuts
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (event) => {
                // Don't trigger shortcuts when typing in inputs
                if (event.target.matches('input, textarea, select')) {
                    return;
                }

                // Handle keyboard shortcuts
                switch (event.key) {
                    case '/':
                        event.preventDefault();
                        this.focusSearch();
                        break;
                    case 'Escape':
                        this.clearFilters();
                        break;
                    case '?':
                        event.preventDefault();
                        this.showKeyboardHelp();
                        break;
                }
            });
        },

        /**
         * Focus the search input
         */
        focusSearch() {
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        },

        /**
         * Show keyboard shortcuts help
         */
        showKeyboardHelp() {
            const helpText = `
Keyboard Shortcuts:
• / - Focus search
• Escape - Clear filters
• ? - Show this help

Click any code to copy to clipboard
      `.trim();

            alert(helpText);
        },

        // ========================================================================
        // Utility Methods
        // ========================================================================

        /**
         * Get category by ID
         */
        getCategoryById(id) {
            return this.cheatsheet.categories?.find(cat => cat.id === id);
        },

        /**
         * Format date for display
         */
        formatDate(dateString) {
            if (!dateString) return 'Unknown';

            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (error) {
                return dateString;
            }
        }
    }));
});

// ============================================================================
// Global Enhancements
// ============================================================================

/**
 * Enhance code elements with better copy functionality on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Add tooltip to all code elements
    document.addEventListener('mouseover', (event) => {
        if (event.target.matches('code')) {
            event.target.title = 'Click to copy';
        }
    });

    console.log('✨ Enhanced code copy functionality loaded');
});

/**
 * Progressive Enhancement for older browsers
 */
if (!window.fetch) {
    console.warn('⚠️ Fetch API not supported. Please use a modern browser.');
}

if (!navigator.clipboard) {
    console.warn('⚠️ Clipboard API not supported. Using fallback copy method.');
}

/**
 * Theme preference detection and management
 */
const themeManager = {
    init() {
        this.setTheme(this.getPreferredTheme());
        this.setupThemeWatcher();
    },

    getPreferredTheme() {
        const stored = localStorage.getItem('cheatsheet-theme');
        if (stored) return stored;

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('cheatsheet-theme', theme);
    },

    setupThemeWatcher() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('cheatsheet-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
};

// Initialize theme management
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
});

console.log('🎯 Simple Neovim Cheatsheet Script Loaded!');
console.log('💡 Use "/" to search, "Escape" to clear filters, "?" for help');
console.log('📋 Click any code snippet to copy to clipboard');
