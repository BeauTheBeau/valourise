const EventEmitter = require('events');
const axios = require('axios');
const signalR = require("@microsoft/signalr");
const {HubConnectionBuilder} = require("@microsoft/signalr");

const ChannelTypeEnum = {
    Undefined: -1,
    PlanetChat: 0,
    PlanetCategory: 1,
    PlanetVoice: 2,
    DirectChat: 3,
    DirectVoice: 4,
    GroupChat: 5,
    GroupVoice: 6,
};


const signalEvents = {
    messageCreated: `Relay`,
    messageUpdated: `RelayEdit`,
    messageDeleted: `RelayDelete`,

    directMessageCreated: `RelayDirect`,
    directMessageUpdated: `RelayDirectEdit`,
    notification: `RelayNotification`,
    notificationCleared: `RelayNotificationCleared`,
    friendEvent: `RelayFriendEvent`,
}

class Client extends EventEmitter {
    async;

    constructor() {
        super();

        this.baseUrl = 'https://app.valour.gg';
        this.hubUrl = `${this.baseUrl}/hubs/core`;

        this.user = null;
        this.token = null;

        this.email = null;
        this.password = null;

        this.connection = null;
    }


    /**
     * @name request
     * @description Sends a request to the Valour API
     * @param {string} endpoint The endpoint to send the request to
     * @param {object} data The data to send with the request
     * @param {object} headers The headers to send with the request
     * @param {('GET'|'POST'|'PUT'|'DELETE'|'PATCH')} method The method to use for the request
     * @returns {Promise<any>}
     */
    async request(endpoint, data, headers = {}, method = 'POST') {

        if (!endpoint) throw new Error('No endpoint provided');
        if (!method) throw new Error('No method provided');
        if (!method || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) throw new Error(`Invalid method: "${method}"`);

        try {
            const url = `${this.baseUrl}/api/${endpoint}`;
            const response = await axios({
                url,
                method: method.toUpperCase(),
                data,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            });

            return response.data;
        } catch (error) {

        }
    }



    /**
     * Establishes a connection to the hub server using WebSocket.
     * @async
     * @returns {Promise<void>} A Promise that resolves when the connection is successfully established.
     */
    async connect() {
        this.connection = new HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                accessTokenFactory: () => {
                    // Return the token here
                    return this.token;
                }
            })
            .withAutomaticReconnect()
            .build();

        await this.hookEvents(this.connection);
        await this.connection.start();
    }

    /**
     * Hook events to a given hub connection.
     * @param {HubConnection} hubConnection - The hub connection object to hook events to.
     * @return {Promise} - A promise that resolves when all events are successfully hooked.
     */
    async hookEvents(hubConnection) {
        for (const event in signalEvents) await hubConnection.on(signalEvents[event], (data) => {
                this.emit(event, data);
            });
    }

    // ----------------------------
    // User Routes
    // Using /users/
    // ----------------------------


    /**
     * @name getUserCount
     * @description Gets the current user count | users/count
     * @see https://app.valour.gg/swagger/index.html#operations-tag-UserApi
     * @returns {Promise<*>}
     */
    async getUserCount() {
        return await this.request('users/count', null, {
            Authorization: `${this.token}`
        }, 'GET');
    }

    /**
     * @name getSelf
     * @description Gets the current user | users/self
     * @see https://app.valour.gg/swagger/index.html#operations-tag-UserApi
     * @returns {Promise<*>}
     */
    async getSelf() {
        if (!this.token) throw new Error('Not logged in');

        return await this.request('users/self', null, {
            Authorization: `${this.token}`
        }, 'GET');
    }

    /**
     * @name getSelfChannelStatus
     * @description Gets the current user's channel status | users/self/channelStatus
     * @see https://app.valour.gg/swagger/index.html#operations-tag-UserApi
     * @returns {Promise<*>}
     */
    async getSelfChannelStatus() {
        return await this.request('users/self/channelStatus', null, {
            Authorization: `${this.token}`
        }, 'GET');
    }


    /**
     * @name getSelfStateData
     * @description Gets the current user's state data | users/self/stateData
     * @see https://app.valour.gg/swagger/index.html#operations-tag-UserApi
     * @returns {Promise<*>}
     */
    async getSelfStateData() {
        if (!this.token) throw new Error('Not logged in');

        return await this.request('users/self/stateData', null, {
            Authorization: `${this.token}`
        }, 'GET');
    }

    /**
     * @name getUser
     * @param {string} search The user to search for
     * @param {boolean} byId Whether to search by ID or name | users/{id} or users/byName/{name}
     * @returns {Promise<*>}
     */
    async getUser(search, byId = true) {

        if (byId) return await this.request(`users/${search}`, null, {
            Authorization: `${this.token}`
        }, 'GET');

        else return await this.request(`users/byName/${search}`, null, {
            Authorization: `${this.token}`
        }, 'GET');

    }

    /**
     * @name updateUser
     * @description Updates a user | PUT users/{id}
     * @param {User} user The user to update
     */
    async updateUser(user) {
        return await this.request(`users/${user.id}`, user, {
            Authorization: `${this.token}`
        }, 'PUT');
    }

    /**
     * Gets the current user's planets or planet IDs.
     * @param {boolean} idOnly - Whether to retrieve only planet IDs.
     * @returns {Promise<Planet>} - The current user's planets or planet IDs.
     */
    async getSelfPlanets(idOnly = false) {
        if (!this.token) throw new Error('Not logged in');

        if (idOnly) return await this.request('users/self/planetids', null, {
            Authorization: `${this.token}`
        }, 'GET');

        else return await this.request('users/self/planets', null, {
            Authorization: `${this.token}`
        }, 'GET');
    }

    /**
     * @name getProfile
     * @description Gets a user's profile | userProfiles/{id}
     * @param {number} id The id of the user to get the profile of
     */

    /**
     * Gets information about a specific planet.
     * @param {string} id - The ID of the planet.
     * @returns {Promise<PlanetInfo>} - Information about the planet.
     */
    async getPlanet(id) {

        return await this.request(`planets/${id}`, null, {
            Authorization: `${this.token}`,
            Cookie: `token=${this.token}`
        }, 'GET');

    }

    /**
     * Gets channels of a specific planet based on type.
     * planets/${id}/channels/chat, planets/${id}/channels/voice, planets/${id}/channels
     * @param {string} id - The ID of the planet.
     * @param {string} type - Type of channels to retrieve.
     * @returns {Promise<PlanetChannels>} - Channels of the specified type in the planet.
     */
    async getPlanetChannels(id, type = 'any') {

        if (!id) throw new Error('No planet ID provided');
        if (!type || !['any', 'chat', 'voice'].includes(type.toLowerCase())) throw new Error(`Invalid channel type: "${type}"`);

        if (type === 'any') return await this.request(`planets/${id}/channels`, null, {
            Authorization: `${this.token}`
        }, 'GET');
        else return await this.request(`planets/${id}/channels/${type}`, null, {
            Authorization: `${this.token}`
        }, 'GET');

    }

    /**
     * Gets information about a specific channel.
     * @param {string} id - The ID of the channel.
     * @returns {Promise<ChannelInfo>} - Information about the channel.
     */
    async getPlanetChannel(id) {
        return await this.request(`channels/${id}`, null, {
            Authorization: `${this.token}`
        }, 'GET');
    }


    /**
     * @name getProfile
     * @description Gets a user's profile | userProfiles/{id}
     */
    async getProfile(id) {
        return await this.request(`userProfiles/${id}`, null, {
            Authorization: `${this.token}`
        }, 'GET');
    }

    /**
     * @name getSelfProfile
     * @description Gets the current user's profile | userProfiles/self
     * @returns {Promise<*>}
     */
    async getSelfProfile() {
        return await this.getProfile(this.user.id);
    }

    /**
     * @name updateProfile
     * @description Updates the current user | PUT users/{id}
     * @param {UserProfile} profile The profile to update
     */
    async updateProfile(profile) {
        const user = await this.getProfile(profile.id);
        return await this.request(`userProfiles/${user.id}`, profile, {
            Authorization: `${this.token}`
        }, 'PUT');
    }


    /**
     * @name updateStatusMessage
     * @description Updates the current user's status message | Helper function for updateUser
     * @param {string} status The status message
     */
    async updateStatusMessage(status) {
        const user = await this.getSelf();
        user.status = status;

        return await this.updateUser(user);
    }

    /**
     * Logs in a user with provided credentials.
     * @param {string} email - User's email.
     * @param {string} password - User's password.
     * @returns {Promise<void>}
     */
    async login(email, password) {

        if (!email || !password) throw new Error('Invalid email or password');

        this.email = email;
        this.password = password;

        this.emit('debug', `Provided credentials: "${email}" / "${password}"`);

        const response = await this.request('users/token', {
            email,
            password
        });

        this.emit('debug', `Received token: "${response.id}"`);
        this.token = response.id;
        this.user = await this.getSelf();
        this.emit('debug', `Received user: "${this.user.name}#${this.user.tag}"`);

        this.emit('debug', `Connecting to hub...`)

        await this.connect();

        this.emit('ready');

    }
    
    /**
     * Logs out the currently logged-in user.
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.token) throw new Error('Not logged in');

        await this.request('users/logout', null, {
            Authorization: `${this.token}`
        }, 'POST');

        this.token = null;
        this.user = null;

        await this.connection.stop()
        this.emit('debug', `Logged out`);
        this.emit('logout');
    }

}


module.exports = { Client, ChannelTypeEnum, signalEvents };

const AccountTypeEnum = {
    Planet: 0,
    User: 1,
};


/**
 * @enum {number} AccountType
 * @description The type of account, used by the economy system
 */


/**
 * @enum {number} ChannelTypeEnum
 * @description The type of channel
 */

/**
 * @typedef {Object} Channel
 * @description Information about a channel
 * @property {string} id
 * @property {number} members
 * @property {string} name The name of the channel
 * @property {string} description The description of the channel
 * @property {number} channelType The type of channel
 * @property {date} lastUpdateTime The last time a message was sent (or event occurred) in this channel
 *
 * Planet channels only!
 * @property {number} planetId The id of the planet this channel belongs to, if any
 * @property {number} parentId The id of the parent of the channel, if any
 * @property {number} position The position of the channel in the channel list
 * @property {boolean} inheritPerms If this channel inherits permissions from its parent
 * @property {boolean} isDefault If this channel is the default channel
 */

/**
 * @typedef {Object} ChannelMember
 * @description Channel members represent members of a channel that is not a planet channel In direct message channels
 *              there will only be two members, but in group channels there can be more
 * @property {number} id
 * @property {number} channelId The id of the channel this member belongs to
 * @property {number} userId The id of the user this member represents
 */

/**
 * @typedef {Object} CreateChannelRequest
 */


/**
 * @typedef {Object} Currency
 * @description Represent a type of cash declared by a planet.
 * @property {number} Id The database id of this currency
 * @property {number} PlanetId The planet this currency belongs to
 * @property {string} Name The name of this currency (ie dollar)
 * @property {string} PluralName The plural name of this currency (ie dollars)
 * @property {string} ShortCode The short-code for this currency (ie USD)
 * @property {string} Symbol The symbol to display before the value (ie $)
 * @property {number} Issued The total amount of this currency that has been issued
 * @property {number} DecimalPlaces The number of decimal places this currency supports
 */


/**
 * @typedef {Object} User
 * @description The User class represents a user in the system.
 * @property {string} PfpUrl The url for the user's profile picture
 * @property {Date} TimeJoined The Date and Time that the user joined Valour
 * @property {string} Name The name of this user
 * @property {string} Tag The tag (discriminator) of this user
 * @property {boolean} Bot True if the user is a bot
 * @property {boolean} Disabled True if the account has been disabled
 * @property {boolean} ValourStaff True if this user is a member of the Valour official staff team
 * @property {string} Status The user's currently set status
 * @property {number} UserStateCode The integer representation of the current user state
 * @property {Date} TimeLastActive The last time this user was flagged as active (successful auth)
 * @property {boolean} IsMobile True if the user has been recently on a mobile device
 * @property {boolean} Compliance If the user has completed the compliance step for regulatory purposes
 * @property {string} SubscriptionType If not null, the type of UserSubscription the user currently is subscribed to
 */

/**
 * @typedef {Object} UserProfile
 * @description The UserProfile class represents a user's profile in the system.
 * @property {number} Id The user the profile belongs to
 * @property {string} Headline The 'headline' is the short top text in the profile
 * @property {string} Bio The bio of the profile. Supports markdown. 500 chars max length
 * @property {string} BorderColor The simple border color of the profile.
 * @property {string} GlowColor The glow color of the profile
 * @property {string} PrimaryColor Primary color, used in border and other details
 * @property {string} SecondaryColor Secondary color, used in border and other details
 * @property {string} TertiaryColor Tertiary color, used in border and other details
 * @property {string} TextColor The color of the main text
 * @property {boolean} AnimatedBorder True if the border should be animated
 * @property {string} BackgroundImage The background image for the profile (should be 300x400)
 */

/**
 * @typedef HubConnection
 * @description The hub connection object.
 * @see https://docs.microsoft.com/en-us/javascript/api/%40microsoft/signalr/hubconnection?view=signalr-js-latest
 */


