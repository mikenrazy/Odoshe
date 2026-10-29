# Stage Designer Pro

Build a professional web application called LED Stage Designer & Previsualizer. for dx5ve studio

The application is intended for professional live-event production teams to design LED stages, configure LED screens, create pixel canvases, map content, and preview the final result in a realistic 3D environment.

IMPORTANT:

Do NOT attempt to build the entire application at once.

For this first version, build only the 3D Stage Designer and LED Screen Configuration system.

Do not implement video mapping, media playback, processor simulation, or advanced content mapping yet. We will add those in later stages.

CORE APPLICATION STRUCTURE

Create a modern dark professional production interface.

Layout:

Left sidebar: project and design tools

Center: large interactive 3D viewport

Right sidebar: properties/configuration

Bottom: timeline/status/information panel

The interface should feel similar to professional production software such as Resolume, Pixera, Disguise, Unreal Engine, or professional CAD/previsualization software.

Do not copy their UI. Create an original modern interface.

1. PROJECT SYSTEM

Create a project dashboard.

Allow the user to:

Create project

Open project

Rename project

Duplicate project

Delete project

Save project

Auto-save project

Example project:

"Connected Africa 2026"

Store the project configuration so that the stage can be reopened exactly as it was designed.

Use Supabase for persistent project storage if Supabase is already connected.

2. 3D STAGE VIEWPORT

Use Three.js / React Three Fiber for the 3D environment.

Create a realistic stage environment.

The viewport must support:

Orbit camera

Pan

Zoom

Rotate

Front view

Rear view

Left view

Right view

Top view

Perspective view

Reset camera

Add a simple professional stage:

Stage floor

Back wall

Stage platform

Optional stairs

Optional podium

Audience area placeholder

The stage should be displayed in realistic 3D.

3. LED SCREEN TOOL

Create an "Add LED Screen" tool.

When clicked, add a new LED screen to the 3D stage.

Each LED screen must be an independent object.

Default:

Name:
LED Screen 01

Physical Width:
10m

Physical Height:
4m

Pixel Resolution:
1920 × 1080

Pixel Pitch:
2.9mm

4. LED SCREEN PROPERTIES

When an LED screen is selected, show its properties in the right sidebar.

Properties:

Identification

Screen Name

Screen ID

Screen Type

Physical Dimensions

Width

Height

Depth

Pixel Configuration

Pixel Width

Pixel Height

Pixel Pitch

Position

X

Y

Z

Rotation

X

Y

Z

Curvature

Curved / Flat

Curve Radius

Curve Angle

All changes must update the 3D screen immediately.

5. SCREEN TYPES

Allow the user to select:

Flat LED Wall

Vertical LED

Curved LED

LED Column

LED Strip

Floor LED

Custom LED

For a curved LED, allow:

Curve Angle:
0°–180°

Curve Radius:

Number of LED sections/panels.

The curved screen must actually curve in the 3D viewport rather than simply changing its appearance.

6. SCREEN TRANSFORMATION

Allow screens to be manipulated visually.

When selected, show a 3D transform gizmo.

Allow:

Move

Rotate

Scale

Also allow exact numerical values in the properties panel.

Changes made through the gizmo must update the numerical properties.

Changes made through numerical properties must update the 3D object.

7. LED PANEL GRID

When an LED screen is selected, provide an option:

"Show LED Panel Grid"

When enabled, display the individual physical LED panels.

For example:

Screen:

1920 × 1080

Panel configuration:

4 × 2 panels

The 3D viewport should visually show the panel divisions.

This is only a visualization; we will implement detailed panel mapping later.

8. SCREEN PRESETS

Create quick presets.

Examples:

Center LED

1920 × 1080

Side LED

480 × 1080

Large LED

3840 × 1080

Vertical LED

480 × 1080

Custom

User-defined.

When selecting a preset, automatically populate the correct dimensions and resolution.

9. MULTIPLE LED SCREENS

The user must be able to add unlimited LED screens.

Example stage:

LEFT LED
480 × 1080

CENTER LED
1920 × 1080

RIGHT LED
480 × 1080

The 3D viewport must show all three physical LED screens.

Each screen must have its own:

Name

Resolution

Position

Rotation

Dimensions

Curvature

10. OBJECT TREE

Create an object hierarchy panel.

Example:

PROJECT
│
├── STAGE
│
├── LED SCREENS
│ ├── LEFT LED
│ ├── CENTER LED
│ └── RIGHT LED
│
├── LIGHTING
│
└── PROPS

Allow:

Select

Rename

Hide

Show

Lock

Unlock

Delete

11. STAGE DIMENSIONS

Add stage configuration.

Allow:

Stage Width
Stage Depth
Stage Height

Example:

Width: 14m
Depth: 6m
Height: 0.5m

The 3D stage must update based on these values.

12. MEASUREMENT SYSTEM

Use real-world units.

Primary unit:

Meters

Allow display of:

Width

Height

Depth

Distance between screens

Screen elevation

Screen position

Show measurement guides in the 3D viewport.

13. 3D VISUAL QUALITY

Make the stage visually professional.

Include:

Realistic LED emissive material

LED glow

Stage shadows

Ambient lighting

Basic venue lighting

Reflective stage floor

Dark venue environment

LED screens should look like real LED walls rather than simple colored rectangles.

14. DESIGN MODES

Add three viewport modes:

DESIGN

Used to build the physical stage.

CONFIGURATION

Used to configure LED dimensions and resolutions.

3D PREVIEW

Used to view the finished stage without editing controls.

15. IMPORTANT DATA MODEL

Structure the application so future versions can add:

Master canvas

LED mapping

Media

Video playback

Graphics

Layers

Masks

Processor outputs

Output mapping

Technical drawings

Do NOT hard-code the current screen configuration.

Every LED screen must be stored as a configurable object.

Example conceptual data:

screen = {
id,
name,
type,
physicalWidth,
physicalHeight,
pixelWidth,
pixelHeight,
pixelPitch,
position,
rotation,
curvature,
panelConfiguration
}

16. PROFESSIONAL UI

Use a clean dark production-software interface.

Avoid excessive rounded cards and unnecessary decorative elements.

Prioritize:

Large viewport

Clear controls

Compact property panels

Professional typography

Good spacing

Keyboard shortcuts

Fast interaction

Add keyboard shortcuts:

Delete = delete selected object

Ctrl/Cmd + Z = undo

Ctrl/Cmd + Shift + Z = redo

F = focus selected object

G = move

R = rotate

S = scale

17. DO NOT IMPLEMENT YET

Do NOT build these features in this stage:

Video playback

Media server

Content mapping

Master canvas

Processor simulation

DMX

NDI

SDI

RTMP

Resolume integration

Pixera integration

Disguise integration

Those will be added after the physical stage and LED configuration system is stable.

SUCCESS CRITERIA

The first version is successful when I can:

Create a project.

Create a 14m × 6m stage.

Add a center LED.

Add left and right LED screens.

Configure their physical dimensions.

Configure their pixel resolutions.

Move them around the stage.

Rotate them.

Curve them.

See the individual LED panel structure.

View the entire stage in 3D.

Save the project.

Reopen the project with the exact same configuration.

Build this as a solid foundation for the future LED mapping and media-server system.

Do not create fake functionality or placeholder buttons that appear functional but do nothing.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://odoshe.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3b9809da-3cc5-41e8-9843-ef4c82321670).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
