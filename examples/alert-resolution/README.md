# Alert resolution IDs

When you resolve events with `POST /alerts/events:resolve`, `resolutionId` and `alertCategory` must be IDs from the tables below. The lists are the same for every account. Any other ID, including an account's custom resolution or category, is rejected with a 400 that names the field. See the [API Specification](../../api-specs/api.yaml) for the request and response.

## Resolutions

Send one of these as `resolutionId`.

| Name | ID |
| --- | --- |
| Automated Deterrence | `6972548f-3e34-4ff7-ba9b-bd9b36eb2d7a` |
| False Alarm | `036b036f-cebb-4c85-874d-f3032b9de2a0` |
| Law Enforcement Dispatched | `b8c108a5-21d9-4873-ba58-bd54c8278094` |
| Non-Threatening Alarm | `d2df40f9-316a-4cb5-b62b-9a58461d229d` |
| Operator-Initiated Deterrence | `d03a50a7-cbf1-4c9c-b8e4-5804a2de3782` |
| Security Personnel Dispatched | `7b2d9c65-fe83-4d00-85ad-84cde7d04fd9` |
| Unit Temporarily Disarmed for Authorized Presence | `ea3a1de2-ccb1-4fa3-b7ac-6706deffc156` |

## Incident categories

Send one of these as `alertCategory`.

| Name | ID |
| --- | --- |
| Animal | `3d41fc84-8d63-45d1-b504-bd3c76721082` |
| Calibration Issue | `23aa5ae5-98d0-48c7-a6cb-1b96d41ebc12` |
| Criminal Activity | `c34f234d-b216-4a4c-a143-9c3b11859774` |
| Employee-Related | `3c4037fa-3c7d-4f88-be8a-5ede0bd74971` |
| Environmental Hazards | `0174d7e5-529f-4f0d-8c93-ef2f0e79595f` |
| False Alarm | `3a636c30-8555-4267-8bda-49f9a066fdb1` |
| Health and Safety Incident | `9edaaf64-b6c1-4bc5-ac69-f7555f466e42` |
| LVT Technician | `7775b5a3-bfce-45af-ae8f-d466a7829f03` |
| Natural Disaster | `d6ccf343-b275-4cd6-848d-c179bde1a5aa` |
| Non-Suspicious Person/Vehicle Activity | `a872f9a9-124f-47c7-8e6f-0b234d8afae9` |
| Obstruction | `250544bf-2b55-4d92-803d-b7a89fedd855` |
| Permitted Visit | `2f42fc66-106b-4738-a008-6ab771d827a3` |
| Suspicious Activity and Behavior | `35db358c-163c-4a92-9965-10f6d7d8c1ec` |
| System Tampering | `9bd13260-711b-4e1f-9b7a-50497f36d494` |
| Trespassing/Loitering | `652b6f41-7bd2-4d2c-aa49-767290d5c50c` |
