////////////////////////////////////////////////////////////////////////////////////////////////////
// BouyomiLimeChat.js ～ 棒読みちゃん・LimeChat連携スクリプト with twitch配信者向けカスタマイズ
////////////////////////////////////////////////////////////////////////////////////////////////////
//■導入方法
// 1.当ファイルをLimeChatのscriptsフォルダに配置する
//   例）C:\【LimeChatインストール先】\users\【アカウント名】\scripts
//
// 2.LimeChat側でスクリプトを有効にする
//   ・LimeChatのメニューから「設定→スクリプトの設定」を開く。
//   ・スクリプトの設定画面で、「BouyomiLimeChat.js」の行を右クリックし、○を付ける。
//   ・スクリプトの設定画面の閉じるボタンを押す。
//
////////////////////////////////////////////////////////////////////////////////////////////////////
// 2015.12.08 @shirataki_nico2 NGリスト機能を追加
// 2015.11.24 @shirataki_nico2 twitch配信者向けのsubscriber_list登録を追加
//
////////////////////////////////////////////////////////////////////////////////////////////////////
//■設定

//発言者の名前を読み上げるかどうか(true:読む, false:読まない)
var bNick = true;

//入出情報を読み上げるかどうか(true:読む, false:読まない)
var bInOut = false;

//ビジーモード[常連ユーザ・購読者限定読み上げモード]（true:読む, false:読まない)
var bBusyMode = false;

//常連ユーザとPaypal購読者のみ読み上げするモード（true:読む, false:読まない)
var bVeryBusyMode = false;

//twitchのsubscriber_listのパスを指定してください。
//※ファイルパスは絶対パス指定。\\で区切ってください(Java Scriptの仕様のため）。
var twitchSubscriptionsFilePath = "C:\\Users\\USER\\Documents\\subscriber_list.csv";


//ユーザ名は、すべて小文字に変換して記載してください。
//常連ユーザ名を追加してください。
var friendlyUserList = [ 
"test", "test2" 
];

//paypal購読ユーザ名を追加してください。
var paypalSubscriptionList = [ 
"test3", "test4" 
];

// bBusyModeの有無に関わらず読み上げないユーザ
var ngList = [
"nightbot", "nguser2"
];

////////////////////////////////////////////////////////////////////////////////////////////////////

var sRemoteTalkCmd = null;
var oShell;
var oWmi;


////////////////////////////////////////////////////////////////////////////////////////////////////
// ↓ ここから追加分 ( @shirataki_nico2 )
////////////////////////////////////////////////////////////////////////////////////////////////////

/*
	@brief	CSVデータにユーザ名が存在するかチェックする
 */
function checkUserFromSubscriptionList( a_CsvData, a_User ) 
{
	var tempArray = a_CsvData.split("\n");
	var csvArray = new Array();
	for(var ii = 0; ii < tempArray.length; ii++)
	{
		csvArray[ii] = tempArray[ii].split(",");
		
		// 1行目はヘッダなので読み飛ばす
		if ( ii == 0 )
		{
			continue;
		}

		if ( csvArray[ii][0] == a_User )
		{
			return true;
		}
	}
	return false;

}

/*
	@brief	Twitchの購読者リストチェック
	@note	購読者リストCSVをファイルオブジェクトとして読み込み、
		CSVパーサーに引き渡して、結果を返す。
	@return	true: 読み上げOK / false: 読み上げNG
 */
function twitchUserChecker( a_User )
{
	for ( var ii = 0; ii < ngList.length; ii++ )
	{
		if ( ngList[ii] == a_User )
		{
			return false;
		}
	}


	if ( bBusyMode == false )
	{
		return true;
	}

	var acceptStatus = false;

	// 常連さんチェック
	for ( var ii = 0; ii < friendlyUserList.length; ii++ )
	{
		if ( friendlyUserList[ii] == a_User )
		{
			acceptStatus = true;
		}
	}

	// Paypal購読者チェック
	for ( var ii = 0; ii < paypalSubscriptionList.length; ii++ )
	{
		if ( paypalSubscriptionList[ii] == a_User )
		{
			acceptStatus = true;
		}
	}


	// Twitch購読者リストチェック
	if ( acceptStatus == false && bVeryBusyMode == false)
	{
		var fileObject = openFile( twitchSubscriptionsFilePath );

		if ( fileObject != null )
		{
			var fileData = fileObject.readAll();
			acceptStatus = checkUserFromSubscriptionList( fileData, a_User );
			fileObject.close();
		}
	}

	return acceptStatus;
}

/*
	@brief	デリミタを検査して、棒読みちゃんに渡すメイン
 */
function validateDelimiter( a_Nick, a_Text )
{
	// 宛先付きアドレスもしくはURLがあれば読み上げない
	if ( (a_Text.lastIndexOf("@") == -1) && (a_Text.lastIndexOf("ttp") == -1) )
	{
		// デリミタまで読み上げるため、検索する。
		var lastDelimiter = a_Text.lastIndexOf("。");

		if ( lastDelimiter != -1 )
		{
			var validatedText = a_Text.slice( 0, lastDelimiter );

			if (bNick){
				addTalkTask(a_Nick + "。" + validatedText);
			} else {
				addTalkTask(validatedText);
			}

		}
	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////
// ↑ ここまで追加 ( @shirataki_nico2 )
////////////////////////////////////////////////////////////////////////////////////////////////////


function addTalkTask(text) {
	if(sRemoteTalkCmd == null) {
		findRemoteTalk();
		if(sRemoteTalkCmd == null) {
			log("RemoteTalkが見つからないのでスキップ-" + text);
			return;
		}
	}
	
	oShell.Run(sRemoteTalkCmd + " \"" + text.replace("\"", " ") + "\"", 0, false);

}

function talkChat(prefix, text) {
//↓ ここから追加 ( @shirataki_nico2 )
	if ( twitchUserChecker(prefix.nick) == true )
	{
		validateDelimiter( prefix.nick, text );
	}
//↑ ここまで追加 ( @shirataki_nico2 )
}

function findRemoteTalk() {
	var proc = oWmi.ExecQuery("Select * from Win32_Process Where Name like 'BouyomiChan.exe'");
	var e    = new Enumerator(proc);
	for(; !e.atEnd(); e.moveNext()) {
		var item = e.item();
		
		var path = item.ExecutablePath.replace("\\BouyomiChan.exe", "");
		sRemoteTalkCmd = "\"" + path + "\\RemoteTalk\\RemoteTalk.exe\" /T";
		
		log("棒読みちゃん検出:" + path);
	}
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function event::onLoad() {
	oShell = new ActiveXObject("Wscript.Shell");
	oWmi   = GetObject("winmgmts:\\\\.\\root\\cimv2");
	
	//addTalkTask("ライムチャットとの連携を開始しました");
}

function event::onUnLoad() {
	oShell = null;
	oWmi   = null;
	
	//addTalkTask("ライムチャットとの連携を終了しました");
}

function event::onConnect(){
	addTalkTask(name + "サーバに接続しました");
}

function event::onDisconnect(){
	addTalkTask(name + "サーバから切断しました");
}

function event::onJoin(prefix, channel) {
	if (bInOut) {
		addTalkTask(prefix.nick + "さんが " + channel + " に入りました");
	}
}

function event::onPart(prefix, channel, comment) {
	if (bInOut) {
		addTalkTask(prefix.nick + "さんが " + channel + " から出ました。");
	}
}

function event::onQuit(prefix, comment) {
	if (bInOut) {
		addTalkTask(prefix.nick + "さんがサーバから切断しました。");
	}
}

function event::onChannelText(prefix, channel, text) {
	talkChat(prefix, text);
	//log("CnannelText[" + channel + "]" + text);
}

function event::onChannelNotice(prefix, channel, text) {
	talkChat(prefix, text);
	//log("CnannelNotice[" + channel + "]" + text);
}

function event::onChannelAction(prefix, channel, text) {
	talkChat(prefix, text);
	//log("CnannelAction[" + channel + "]" + text);
}

function event::onTalkText(prefix, targetNick, text) {
	talkChat(prefix, text);
	//log("TalkText[" + prefix.nick + "]" + text);
}

function event::onTalkNotice(prefix, targetNick, text) {
	talkChat(prefix, text);
	//log("TalkNotice[" + prefix.nick + "]" + text);
}

function event::onTalkAction(prefix, targetNick, text) {
	talkChat(prefix, text);
	//log("TalkAction[" + prefix.nick + "]" + text);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
