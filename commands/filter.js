import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { parseFilter, getLocale } from '../index.js';
import DB from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Enable / Disable filters for recently played maps')
        .addSubcommandGroup(subcommandgroup =>
            subcommandgroup
                .setName("perso")
                .setDescription("Filters that will be applied to the personal channel of the said user")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a filter for your maps sent in the personal channel of this server')
                        .addStringOption(option =>
                            option.setName('filter')
                                .setDescription('The filter to add')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'FC Only', value: 'fc' },
                                    { name: 'Personal Best/map Only', value: 'pb' },
                                    { name: 'Hide Fail', value: 'nf' },
                                    { name: 'Hide Score', value: 'hidescore' },
                                    { name: 'Hide Session', value: 'hidesession'}
                                )
                        )
                        .addUserOption(option => option.setName('user').setDescription("The targeted user (empty for yourself)").setRequired(false))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a filter for your maps sent in the personal channel of this server')
                        .addStringOption(option =>
                            option.setName('filter')
                                .setDescription('The filter to remove')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'FC Only', value: 'fc' },
                                    { name: 'Personal Best/map Only', value: 'pb' },
                                    { name: 'Hide Fail', value: 'nf' },
                                    { name: 'Hide Score', value: 'hidescore' },
                                    { name: 'Hide Session', value: 'hidesession' }
                                )
                        )
                        .addUserOption(option => option.setName('user').setDescription("The targeted user (empty for yourself)").setRequired(false))
                )
        )
        .addSubcommandGroup(subcommandgroup =>
            subcommandgroup
                .setName("global")
                .setDescription("Filters that will be applied to the global channel")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a filter for your maps sent in any global channel')
                        .addStringOption(option =>
                            option.setName('filter')
                                .setDescription('The filter to add')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'FC Only', value: 'fc' },
                                    { name: 'Personal Best/map Only', value: 'pb' },
                                    { name: 'Hide Fail', value: 'nf' },
                                    { name: 'Hide Score', value: 'hidescore' },
                                    { name: 'Hide Session', value: 'hidesession' }
                                )
                        )
                        .addUserOption(option => option.setName('user').setDescription("The targeted user (empty for yourself)").setRequired(false))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove a filter for your maps sent in any global channel')
                        .addStringOption(option =>
                            option.setName('filter')
                                .setDescription('The filter to remove')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'FC Only', value: 'fc' },
                                    { name: 'Personal Best/map Only', value: 'pb' },
                                    { name: 'Hide Fail', value: 'nf' },
                                    { name: 'Hide Score', value: 'hidescore' },
                                    { name: 'Hide Session', value: 'hidesession' }
                                )
                        )
                        .addUserOption(option => option.setName('user').setDescription("The targeted user (empty for yourself)").setRequired(false))
                )
        ),


    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        let discordId = interaction.member.id;
        const serverId = interaction.guildId;
        const server = await DB.getServer(serverId);
        const lang = server.language;
        
        const subCommandGroup = interaction.options.getSubcommandGroup();
        const subCommand = interaction.options.getSubcommand();
        let selectedOption = interaction.options.getString("filter");
        const parsedFilter = parseFilter(selectedOption);

        await interaction.deferReply({ ephemeral: true });

        if (interaction.options.getUser("user") != null){
            discordId = interaction.options.getUser("user").id;
        }
        const user = await DB.getUser(discordId);
        
        let message = "";
        let scope = "";
        let enabledFilters;

        // Check if the user is linked to the bot
        if (user == null) {
            return interaction.editReply({ content: getLocale(lang, "commandAccountUserNotLinked", `<@${discordId}>`)})
        }

        // Setting up filters
        switch (subCommandGroup) {

            case "perso":
                const personnalChannel = await DB.getPersonalChannel(serverId, discordId);
                // Check if the user has a personal channel
                if (personnalChannel == null) {
                    return interaction.editReply({ content: getLocale(lang, "commandFilterUserHaveNoPersonnalChannel", `<@${discordId}>`)})
                }
                scope = getLocale(lang, "commandFilterPersonnal");
                switch (subCommand) {
                    case "add":
                        // Is filter active ?
                        if (personnalChannel.filter.includes(selectedOption)) {
                            return interaction.editReply({ content: `[${scope}] ${getLocale(lang, "commandFilterAlreadyActiveForUser", parsedFilter, `<@${discordId}>`)}`});
                        }

                        await DB.setPersonalFilter(serverId, discordId, selectedOption, true);
                        message = `[${scope}] ${getLocale(lang, "commandFilterEnabled", parsedFilter)}`;
                        break;

                    case "remove":
                        // Is filter active ?
                        if (!personnalChannel.filter.includes(selectedOption)) {
                            return interaction.editReply({ content: `[${scope}] ${getLocale(lang, "commandFilterAlreadyInactiveForUser", parsedFilter, `<@${discordId}>`)}`});
                        }
                        await DB.setPersonalFilter(serverId, discordId, selectedOption, false);
                        message = `[${scope}] ${getLocale(lang, "commandFilterDisabled", parsedFilter)}`;
                        break;
                }

                // Get active filter after they have been aplied
                enabledFilters = await DB.getPersonalFilters(serverId, discordId);
                break;

            case "global":
                scope = getLocale(lang, "commandFilterGlobal");
                switch (subCommand) {
                    case "add":
                        // Is filter active ?
                        if (user.filter.includes(selectedOption)) {
                            return interaction.editReply({ content: `[${scope}] ${getLocale(lang, "commandFilterAlreadyActiveForUser", parsedFilter, `<@${discordId}>`)}`});
                        }

                        await DB.setGlobalFilter(discordId, selectedOption, true);
                        message = `[${scope}] ${getLocale(lang, "commandFilterEnabled", parsedFilter)}`;
                        break;

                    case "remove":
                        // Is filter active ?
                        if (!user.filter.includes(selectedOption)) {
                            return interaction.editReply({ content: `[${scope}] ${getLocale(lang, "commandFilterAlreadyInactiveForUser", parsedFilter, `<@${discordId}>`)}`});
                        }
                        await DB.setGlobalFilter(discordId, selectedOption, false);
                        message = `[${scope}] ${getLocale(lang, "commandFilterDisabled", parsedFilter)}`;
                        break;
                }

                // Get active filter after they have been aplied
                enabledFilters = await DB.getGlobalFilters(discordId);
                break;
        }

        // Send message when there are no filters active
        if (enabledFilters == null) {
            return interaction.editReply({ content: `<@${discordId}> ${message}`});
        }

        // Send a message with all active filters
        let enabledFiltersMessage = `\n${getLocale(lang, "commandFilterSummary", `<@${discordId}>`)} (${scope})`;
        for (let i = 0; i < enabledFilters.length; i++) {
            enabledFiltersMessage += `\n- ${parseFilter(enabledFilters[i])}`;
        }
        return interaction.editReply({ content: message + enabledFiltersMessage})
    }
}