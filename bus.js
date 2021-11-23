"use strict";

const resultBox = document.querySelector(".result__box");
const resultCity = document.querySelector(".result__city");
const cityBox = document.querySelector(".search__city");
const searchBtn = document.querySelector(".search__btn");
const searchText = document.querySelector(".header-1__text");
const roadStart = document.querySelector(".road-start");
const roadEnd = document.querySelector(".road-end");
const goStart = document.querySelector(".road__start");
const goEnd = document.querySelector(".road__end");
const back = document.querySelector(".back");

let city = cityBox.value;
let routeName;
// API 驗證用
function GetAuthorizationHeader() {
  var AppID = "2af5643ac6c948c4b206225d87f27506";
  var AppKey = "5ewryF_mUSxIGukfP-b5CyCnE-o";

  var GMTString = new Date().toGMTString();
  var ShaObj = new jsSHA("SHA-1", "TEXT");
  ShaObj.setHMACKey(AppKey, "TEXT");
  ShaObj.update("x-date: " + GMTString);
  var HMAC = ShaObj.getHMAC("B64");
  var Authorization =
    'hmac username="' +
    AppID +
    '", algorithm="hmac-sha1", headers="x-date", signature="' +
    HMAC +
    '"';

  return {
    Authorization: Authorization,
    "X-Date": GMTString,
  };
}

// 獲取縣市名稱
axios({
  method: "get",
  url: "https://gist.motc.gov.tw/gist_api/V3/Map/Basic/City?$format=JSON",
  headers: GetAuthorizationHeader(),
})
  .then((response) => {
    //console.log(response.data);

    const cityData = response.data;

    let cityName = "";
    cityData.forEach((item) => {
      cityName += `<option  value="${item.City}">${item.CityName}</option>`;
    });
    cityBox.insertAdjacentHTML("beforeend", cityName);
  })
  .catch((error) => console.log("error", error));

cityBox.addEventListener("change", function () {
  //console.log(cityBox.value);

  city = cityBox.value;
});

// get 公車預估到站資料
let busData = [];
let goData = [];
let backData = [];

function getBus() {
  axios({
    method: "get",
    url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/${city}/${routeName}`,
    headers: GetAuthorizationHeader(),
  })
    .then((response) => {
      const data = response.data;
      //console.log("預估", data);

      // 篩出有在跑的公車(存公車物件)
      const bus = data.filter((item) => item.PlateNumb);
      //console.log("bus", bus);

      //從有在跑的公車資料裡分類出「去程0」與「返程1」
      const cachegoData = bus.filter((item) => !item.Direction);
      const cachebackData = bus.filter((item) => item.Direction);
      //console.log("cachebackData", cachebackData);
      // console.log('cachegoData',goData)

      // 組出我要的資料格式

      cachegoData.forEach((item) => {
        // [a,a,b,c]
        const index = goData
          .map((item) => item.plateNumb)
          .indexOf(item.PlateNumb);

        if (index === -1) {
          // 代表沒找到
          goData.push({
            plateNumb: item.PlateNumb, //車牌號碼
            stops: [
              {
                estimateTime: item.EstimateTime, //到站時間預估(秒)
                stopUID: item.StopUID, //站牌唯一識別代碼
              },
            ],
          });
        } else {
          // 有找到
          goData[index].stops.push({
            estimateTime: item.EstimateTime, //到站時間預估(秒)
            stopUID: item.StopUID, //站牌唯一識別代碼
          });
        }
      });
      //console.log("goData", goData);

      cachebackData.forEach((item) => {
        // [a,a,b,c]
        const index = backData
          .map((item) => item.plateNumb)
          .indexOf(item.PlateNumb);

        if (index === -1) {
          // 代表沒找到
          backData.push({
            plateNumb: item.PlateNumb, //車牌號碼
            stops: [
              {
                estimateTime: item.EstimateTime, //到站時間預估(秒)
                stopUID: item.StopUID, //站牌唯一識別代碼
              },
            ],
          });
        } else {
          // 有找到
          backData[index].stops.push({
            estimateTime: item.EstimateTime, //到站時間預估(秒)
            stopUID: item.StopUID, //站牌唯一識別代碼
          });
        }
      });
      //console.log("backData", backData);

      getRoute();
    })
    .catch((error) => console.log("error", error));
}

// get 公車路線站序資料

function getRoute() {
  axios({
    method: "get",
    url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/${city}/${routeName}`,
    headers: GetAuthorizationHeader(),
  })
    .then((response) => {
      //console.log("往返列表", response);
      const data = response.data;
      //console.log("data", data);
      const routeData = data.filter(
        (item) => item.RouteName["Zh_tw"] === routeName
      );
      //console.log("routeData", routeData);
      // 返程
      let busID = "";
      let time = 0;
      let timeText = "";

      routeData[0].Stops.forEach((item) => {
        goData.forEach((go) => {
          go.stops.forEach((stop) => {
            if (stop.stopUID === item.StopUID) {
              busID = go.plateNumb;
              time = Math.floor(stop.estimateTime / 60);
              // console.log(busID, time, "go");
              // 文字顯示
              if (time === 0) {
                timeText = "進站中";
              } else if (time <= 1 && 0 < time) {
                timeText = "即將到站";
              } else {
                timeText = `${time} 分鐘`;
              }
            }
          });
        });

        let html = `<li class="road__item">
        <div class="road__time ${timeText === "進站中" ? "pulling-in" : ""}">${
          timeText === "" ? "- - -" : timeText
        }</div>
      <div class="road__location">${item.StopName.Zh_tw}</div>
      </li>`;
        goEnd.insertAdjacentHTML("beforeend", html);
      });
      let c = 0;
      routeData[1].Stops.forEach((item) => {
        backData.forEach((back) => {
          back.stops.forEach((stop) => {
            if (stop.stopUID === item.StopUID) {
              busID = back.plateNumb;
              time = Math.floor(stop.estimateTime / 60);
              //console.log(busID, time, "back");

              // 文字顯示
              if (time === 0) {
                timeText = "進站中";
              } else if (time <= 1 && 0 < time) {
                timeText = "即將到站";
              } else {
                timeText = `${time} 分鐘`;
              }
            }
          });
        });

        let html = `<li class="road__item">
        <div class="road__time ${timeText === "進站中" ? "pulling-in" : ""}">${
          timeText === "" ? "- - -" : timeText
        }</div>
      <div class="road__location">${item.StopName.Zh_tw}</div>
      </li>`;
        goStart.insertAdjacentHTML("beforeend", html);
      });
    })
    .catch((error) => console.log("error", error));
}

//取得起點終點站牌
let busStop = [];
function getStops() {
  busStop = [];
  axios({
    method: "get",
    url: `https://ptx.transportdata.tw/MOTC/v2/Bus/Route/City/${city}/${routeName}`,
    headers: GetAuthorizationHeader(),
  })
    .then((response) => {
      const data = response.data;
      data.forEach((stop) => {
        busStop.push([
          stop.RouteName["Zh_tw"],
          stop.DepartureStopNameZh,
          stop.DestinationStopNameZh,
        ]);

        let html = `<li class="result__road result__road-3">
        <div class="road-name h1-EN">${stop.RouteName["Zh_tw"]}</div>
        <div class="road-direction h3-TC">
          ${stop.DepartureStopNameZh} <span class="road-direction-text">往</span> ${stop.DestinationStopNameZh}
        </div>
      </li>`;
        resultBox.insertAdjacentHTML("beforeend", html);
      });

      if (busStop.length === 0) {
        resultBox.innerHTML =
          '<h1 class="errormessage">找無此路線 請確認輸入的資料</h1>';
      }

      document.querySelectorAll(".result__road").forEach((item, index) =>
        item.addEventListener("click", function () {
          routeName = busStop[index][0];
          roadStart.innerHTML = busStop[index][1];
          roadEnd.innerHTML = busStop[index][2];
          getBus();
          $(".bus-contain").hide();
          $(".result").hide();
          $(".road-contain").show();
        })
      );
    })
    .catch((error) => console.log("error", error));
}

searchBtn.addEventListener("click", function () {
  goStart.innerHTML = "";
  goEnd.innerHTML = "";
  resultBox.innerHTML = "";
  routeName = searchText.value;
  city !== "" ? getStops() : "";
  resultCity.textContent = cityBox.options[cityBox.selectedIndex].text;
});

document.querySelectorAll(".value-btn").forEach((btn) =>
  btn.addEventListener("click", function () {
    searchText.value = searchText.value + btn.textContent;
  })
);

document.querySelector(".clear-btn").addEventListener("click", function () {
  searchText.value = "";
});

back.addEventListener("click", function () {
  // searchText.value = "";
  // resultBox.innerHTML = "";
  // resultCity.textContent = "";
  // cityBox.selectedIndex = "0";
  $(".bus-contain").show();
  $(".result").show();
  $(".road-contain").hide();
});

$(".road-contain").hide();
