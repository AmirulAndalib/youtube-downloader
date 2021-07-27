import { getVideoId, setStorage } from "./utils";
import { createFFmpeg } from "@ffmpeg/ffmpeg";

type MediaType = "video" | "playlist" | "other";

let gFfmpeg;
const gTracker = {
  videoQueue: [] as string[],
  tabs: new Map() as Map<
    number,
    {
      type: MediaType;
      id: string;
      idVideos?: string[];
    }
  >
};

async function initializeFFmpeg() {
  await setStorage("local", "isFFmpegReady", false);

  gFfmpeg = createFFmpeg({ log: true });
  await gFfmpeg.load();

  await setStorage("local", "isFFmpegReady", true);
}

function getMediaType(url: string): MediaType {
  const urlObj = new URL(url);
  if (urlObj.pathname === "/watch") {
    return "video";
  }
  if (urlObj.pathname === "/playlist") {
    return "playlist";
  }

  return "other";
}

function listenToTabs() {
  chrome.runtime.onConnect.addListener(port => {
    if (port.name === "youtube-page") {
      gTracker.tabs.set(port.sender.tab.id, {
        type: getMediaType(port.sender.url),
        id: getVideoId(port.sender.tab.url)
      });
    }
    port.onDisconnect.addListener(() => {
      const { id: idTab } = port.sender.tab;
      const { id: idVideo } = gTracker.tabs.get(idTab);
      gTracker.tabs.delete(idTab);

      const i = gTracker.videoQueue.indexOf(idVideo);
      if (i > -1) {
        gTracker.videoQueue.splice(i, 1);
      }

      // TODO: Cancel on-going download, if applicable
    });
  });
}

async function init() {
  listenToTabs();
  await initializeFFmpeg();
}

init();
