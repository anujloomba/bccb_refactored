// azure-sync.js - Simulates an Azure backend for data synchronization

class AzureSync {
    constructor() {
        this.DB_KEY = 'azure_cricket_db';
        this.db = this._loadDb();
        // Add a default guest account if it doesn't exist
        if (!this.db['guest']) {
            this.db['guest'] = {
                password: null, // No password for guest
                data: {
                    player_info: [],
                    matches: [],
                    teams: []
                }
            };
            this._saveDb();
        }
    }

    /**
     * Loads the simulated database from localStorage.
     * @returns {object} The database object.
     */
    _loadDb() {
        try {
            const dbString = localStorage.getItem(this.DB_KEY);
            return dbString ? JSON.parse(dbString) : {};
        } catch (error) {
            console.error('Error loading simulated Azure DB:', error);
            return {};
        }
    }

    /**
     * Saves the simulated database to localStorage.
     */
    _saveDb() {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(this.db));
        } catch (error) {
            console.error('Error saving simulated Azure DB:', error);
        }
    }

    /**
     * Simulates registering a new group.
     * @param {string} groupCode - The code for the new group.
     * @param {string} password - The password for the new group.
     * @returns {Promise<object>} A promise that resolves with a success or error message.
     */
    register(groupCode, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!groupCode || !password) {
                    resolve({ success: false, message: 'Group code and password are required.' });
                    return;
                }
                if (this.db[groupCode]) {
                    resolve({ success: false, message: 'Group code already exists.' });
                    return;
                }

                this.db[groupCode] = {
                    password: password, // In a real app, this should be hashed
                    data: {
                        player_info: [],
                        matches: [],
                        teams: []
                    }
                };
                this._saveDb();
                resolve({ success: true, message: 'Group registered successfully!' });
            }, 500); // Simulate network delay
        });
    }

    /**
     * Simulates logging into a group.
     * @param {string} groupCode - The group code to log into.
     * @param {string} password - The password for the group.
     * @returns {Promise<object>} A promise that resolves with a success or error message.
     */
    login(groupCode, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const group = this.db[groupCode];
                if (!group) {
                    resolve({ success: false, message: 'Group not found.' });
                    return;
                }
                if (group.password !== password) {
                    resolve({ success: false, message: 'Incorrect password.' });
                    return;
                }
                resolve({ success: true, message: 'Login successful!' });
            }, 500); // Simulate network delay
        });
    }

    /**
     * Simulates fetching data for a group.
     * @param {string} groupCode - The group code to fetch data for.
     * @returns {Promise<object|null>} A promise that resolves with the group's data or null.
     */
    getData(groupCode) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const group = this.db[groupCode];
                if (group) {
                    // Return a deep copy to prevent direct mutation
                    resolve(JSON.parse(JSON.stringify(group.data)));
                } else {
                    resolve(null);
                }
            }, 800); // Simulate network delay
        });
    }

    /**
     * Simulates saving data for a group.
     * @param {string} groupCode - The group code to save data for.
     * @param {object} data - The data object to save.
     * @returns {Promise<object>} A promise that resolves with a success message.
     */
    saveData(groupCode, data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.db[groupCode]) {
                    this.db[groupCode].data = data;
                    this._saveDb();
                    resolve({ success: true, message: 'Data synced successfully!' });
                } else {
                    resolve({ success: false, message: 'Group not found for saving.' });
                }
            }, 800); // Simulate network delay
        });
    }
}