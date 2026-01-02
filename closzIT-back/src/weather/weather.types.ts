// src/weather/types/weather.types.ts

export interface GridCoord {
  x: number;
  y: number;
}

export interface WeatherInfo {
  date: string;
  time: string;
  temperature: number | null;        // 기온 (℃)
  sky: string | null;                // 하늘상태
  precipitationType: string | null;  // 강수형태
  rainProbability: number;           // 강수확률 (%)
  humidity: number | null;           // 습도 (%)
  windSpeed: number | null;          // 풍속 (m/s)
  locationName: string | null;       // 조회된 장소명
  condition: string;                 // 종합 날씨 상태
}

export interface WeatherApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: WeatherApiItem[];
      };
    };
  };
}

export interface WeatherApiItem {
  fcstDate: string;
  fcstTime: string;
  category: string;
  fcstValue: string;
}

export interface KakaoGeoResponse {
  documents: {
    x: string;  // 경도
    y: string;  // 위도
    place_name?: string;
    address_name?: string;
  }[];
}