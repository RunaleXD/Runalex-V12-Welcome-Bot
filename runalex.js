const { Client, VoiceChannel, GuildMember } = require("discord.js");

const fs = require("fs");
const ayar = JSON.parse(fs.readFileSync("./runalex.json", { encoding: "utf-8" }));

const moment = require("moment");
require("moment-duration-format");

const Voice = new Client({ fetchAllMembers: true, disableMentions: "none" });
Voice.staffJoined = false;
Voice.playingVoice = false;
Voice.voiceConnection = null;
Voice.channelID = null;

Voice.on("ready", async() => {

    Voice.user.setPresence({
        status: "online", // idle = boşta / dnd = rahatsız etmeyin |
        activity: {
            name: "Welcome To 1998"
        }
    });

    Voice.log(`Runalex Bot Başlatıldı.!`);

    const Guild = Voice.guilds.cache.get(ayar.ayarlar.SunucuID) || Voice.guilds.cache.first();
    if(!Guild) {
        Voice.error("Sunucu Bulunamadı!");
        return Voice.destroy();
    }
    
    const Channel = Guild.channels.cache.get(ayar.ayarlar.SesKanal);
    if(!Channel) {
        Voice.error("Kanal Bulunamadı!");
        return Voice.destroy();
    }

    Channel.join().then(connection =>{
            
        Voice.voiceConnection = connection;
        Voice.channelID = Channel.id;
        Voice.log("Ses dosyası şu anda çalınıyor...")
        if(!Channel.hasStaff()) playVoice(Voice);
        else Voice.staffJoined = true;

    }).catch(err => {
        Voice.error(`Cannot connect to voice channel (${Channel.name}) (${Channel.id}): ` + err.message)
        return Voice.destroy();
    });

});

Voice.on("voiceStateUpdate", async(oldState, newState) => {
    if(
        newState.channelID && (oldState.channelID !== newState.channelID) &&
        newState.member.isStaff() &&
        newState.channelID === Voice.channelID &&
        !newState.channel.hasStaff(newState.member)
    ) {
        Voice.staffJoined = true;
        return playVoice(Voice);
    }
    if( 
        oldState.channelID && 
        (oldState.channelID !== newState.channelID) && 
        newState.member.isStaff() && 
        oldState.channelID === Voice.channelID &&
        !oldState.channel.hasStaff()
    ) {
        Voice.staffJoined = false;
        return playVoice(Voice);
    }
});

Voice.login(ayar.TOKEN).catch(err => {
    Voice.error("Ses istemcisine bağlanırken bir hata oluştu: " + err.message);
    return Voice.destroy();
});

/**
 * 
 * @param {Client} Voice 
 */
function playVoice(Voice) {
    try {

        const Path = Voice.staffJoined === true ? "./" + ayar.Ses.YetkiliGirdi : "./" + ayar.Ses.Kayıtsızgiris;
        Voice.playingVoice = true;
        Voice.voiceConnection.play(Path, {
            volume: 0.5
        }).on("finish", async() => {
            Voice.playingVoice = false;
            if(Voice.staffJoined === true) return;
            playVoice(Voice);
        });

    } catch(err) {

        return Voice.log("Ses dosyası oynatılırken bir hata oluştu: " + err.message);
        
    }
};

Client.prototype.log = function(content) {
    return console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] [VOICE BOT] ${content}`);
};

Client.prototype.error = function(content) {
    return console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] [VOICE BOT] ERR! ${content}`);
};

VoiceChannel.prototype.hasStaff = function(checkMember = false) {
    if(this.members.some(m => (checkMember !== false ? m.user.id !== checkMember.id : true) && !m.user.bot && m.roles.highest.position >= m.guild.roles.cache.get(ayar.ayarlar.EnAltYetkili).position)) return true; 
    return false;
}

VoiceChannel.prototype.getStaffs = function(checkMember = false) {
    return this.members.filter(m => (checkMember !== false ? m.user.id !== checkMember.id : true) && !m.user.bot && m.roles.highest.position >= m.guild.roles.cache.get(ayar.ayarlar.EnAltYetkili).position).size
}

GuildMember.prototype.isStaff = function() {
    if(
        !this.user.bot &&
        ([...ayar.ayarlar.OwnerID].includes(this.id) ||
        this.hasPermission("ADMINISTRATOR") ||
        this.roles.highest.position >= this.guild.roles.cache.get(ayar.ayarlar.EnAltYetkili).position
        )
    ) return true;
    return false;
}

