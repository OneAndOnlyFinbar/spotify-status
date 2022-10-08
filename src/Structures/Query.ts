export class Query {
  properties: { [key: string]: any };
  constructor(properties: { [key: string]: any }) {
    this.properties = properties;
  }
  build() {
    return Object.keys(this.properties).map(key => {
      return `${key}=${this.properties[key]}`;
    }).join('&');
  }
}