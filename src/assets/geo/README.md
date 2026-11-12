# 安徽省市县行政边界（原型演示）

## 来源

- 下载日期：2026-11-11（UTC）
- 数据仓库：[santiagoguo/china-geo-drilldown-map](https://github.com/santiagoguo/china-geo-drilldown-map)
- 数据目录：`data/geojson/cities/{市级行政区划代码}.json`
- 仓库许可证：MIT（仅能确认仓库及其代码许可）
- 边界数据上游许可：仓库 README 只说明“generated from public China administrative boundary sources; check upstream licenses before commercial use”，未给出明确的边界数据许可，当前标记为 `待核实`。

## 文件内容

`anhui-admin.json` 包含安徽省 16 个市的市县层级边界：

- 16 个市级 Feature：保留项目现有 `src/mock/geo/anhui-city.json` 的市级几何，用于省级总览。
- 104 个县级 Feature：从上述仓库 16 个安徽市文件导入，包含区、县、县级市等市辖子级边界。
- 每个 Feature 的 `properties` 包含名称、行政区划代码、所属市代码、层级和来源标记。

## 坐标与转换

- 源文件是 GeoJSON，坐标为经度、纬度形式的数值。
- 源仓库未声明 CRS；本次未假设具体坐标系，也未进行坐标转换或投影变换。
- 当前文件只用于原型演示，不应描述为官方行政区划数据或已完成商业授权核验的数据。

## 可追溯检查

- 16/16 安徽市文件可访问并导入。
- 导入结果：16 个市级 Feature + 104 个县级 Feature = 120 个 Feature。
- 天地图密钥未写入本文件、GeoJSON 或代码。
