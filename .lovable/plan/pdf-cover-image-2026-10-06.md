# PDF Cover Image

## What will change
- Add an optional cover-image uploader in Project Setup, with preview, replace, and remove controls.
- Store the selected image with the project so it remains available after reopening the design.
- When present, export it as the first full cover page of the PDF with the project, client, venue, and date.
- Keep the existing screen specification and Content Canvas pages after the cover.

## Technical details
- Store only an image reference in project data and keep the compressed image in the existing browser asset store.
- Restore that asset alongside other project media during project loading.
- Fit the image proportionally inside the A3 landscape cover without stretching or cropping.
- Verify the app build, upload controls, and generated PDF page order.