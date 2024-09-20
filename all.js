var CHANNEL_TOKEN = " ";
var GDRIVE_FOLDER_FILE_ID = " ";
var GDRIVE_FOLDER_IMAGE_ID = " ";
var GDRIVE_FOLDER_VIDEO_ID = " ";
var GDRIVE_FOLDER_AUDIO_ID = " ";

function doPost(e) {
  var value = JSON.parse(e.postData.contents);
  var event = value.events[0];
  var type = event.type;
  var userId = event.source.userId;

  switch (type) {
    case 'message':
      var messageType = event.message.type;
      if (messageType === 'file') {
        handleFileMessage(event);
      } else if (messageType === 'image') {
        sendFlexMessage(userId, toDrive(event.message.id, "image/jpeg", ".jpg", GDRIVE_FOLDER_IMAGE_ID), "");
      } else if (messageType === 'video') {
        sendFlexMessage(userId, toDrive(event.message.id, "video/mp4", ".mp4", GDRIVE_FOLDER_VIDEO_ID), "");
      } else if (messageType === 'audio') {
        sendFlexMessage(userId, toDrive(event.message.id, "audio/mpeg", ".mp3", GDRIVE_FOLDER_AUDIO_ID), "");
      }
      break;
    default:
      Logger.log("Unhandled event type: " + type);
      break;
  }
}

function handleFileMessage(event) {
  var fileName = event.message.fileName;
  var fileType = fileName.split('.').pop();
  var mimetype = getMimeType(fileType);

  if (mimetype !== "undefined") {
    var messageId = event.message.id;
    var fileUrl = toDrive(messageId, mimetype, '.' + fileType, GDRIVE_FOLDER_FILE_ID);
    sendFlexMessage(event.source.userId, fileUrl);
  } else {
    Logger.log("Unsupported file type: " + fileType);
  }
}

function sendFlexMessage(userId, fileUrl) {
  var token = "Bearer " + CHANNEL_TOKEN;

  // ดึงข้อมูลพื้นที่ว่างของ google drive
  var driveUsage = getDriveUsage();

  var flexMessage = {
    "type": "flex",
    "altText": "ไฟล์ของคุณถูกบันทึกแล้ว",
    "contents": {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": "https://img5.pic.in.th/file/secure-sv1/download_pc.png",
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover",
        "action": {
          "type": "uri",
          "uri": fileUrl
        }
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "อัปโหลดสำเร็จ!",
            "weight": "bold",
            "size": "xl",
            "margin": "md",
            "align": "center",
            "color": "#1DB446"
          },
          {
            "type": "text",
            "text": "ไฟล์ของคุณถูกบันทึกแล้ว",
            "size": "sm",
            "align": "center",
            "wrap": true,
            "margin": "sm"
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "พื้นที่ว่างของ Google Drive",
                    "size": "sm",
                    "color": "#aaaaaa"
                  },
                  {
                    "type": "text",
                    "text": driveUsage.percentage + "%",
                    "size": "sm",
                    "color": "#333333",
                    "align": "end"
                  }
                ],
                "margin": "md"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                      {
                        "type": "filler"
                      }
                    ],
                    "flex": driveUsage.percentage,
                    "backgroundColor": "#00b894"
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                      {
                        "type": "filler"
                      }
                    ],
                    "flex": 100 - driveUsage.percentage,
                    "backgroundColor": "#dfe6e9"
                  }
                ],
                "height": "8px",
                "margin": "md"
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#1DB446",
            "action": {
              "type": "uri",
              "label": "ดูไฟล์",
              "uri": fileUrl
            }
          },
          {
            "type": "button",
            "style": "secondary",
            "action": {
              "type": "postback",
              "label": "คัดลอกลิงค์",
              "data": "copy_link",
              "displayText": "" + fileUrl
            }
          }
        ]
      }
    }
  };

  try {
    var response = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      'headers': {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      'method': 'post',
      'payload': JSON.stringify({
        'to': userId,
        'messages': [flexMessage]
      })
    });
    Logger.log("Message sent successfully: " + response.getContentText());
  } catch (error) {
    Logger.log("Error sending Flex Message: " + error);
  }
}

function toDrive(messageId, meType, mType, gdriveId) {
  var url = "https://api-data.line.me/v2/bot/message/" + messageId + "/content";
  var headers = {
    "headers": { "Authorization": "Bearer " + CHANNEL_TOKEN }
  };
  try {
    var getcontent = UrlFetchApp.fetch(url, headers);
    var blob = getcontent.getBlob();
    var fileBlob = Utilities.newBlob(blob.getBytes(), meType, messageId + mType);
    var fileId = DriveApp.getFolderById(gdriveId).createFile(fileBlob).getId();
    Logger.log("Uploaded to Drive: File ID " + fileId);
    return 'https://drive.google.com/uc?id=' + fileId;
  } catch (error) {
    Logger.log("Error uploading to Google Drive: " + error);
    return null;
  }
}

function getDriveUsage() {
  var usage = DriveApp.getStorageUsed();
  var total = 200 * 1024 * 1024 * 1024; // 200 คือความจุของ drive
  var available = total - usage;
  var percentage = Math.round((available / total) * 100);
  return {
    percentage: percentage
  };
}

function getMimeType(fileType) {
  var mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };

  return mimeTypes[fileType.toLowerCase()] || "undefined";
}
