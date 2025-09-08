# MODIFIED: Removed matplotlib.use('Agg') as it's now in main.py
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
# MODIFIED: Corrected the import path for FigureCanvasKivyAgg
from kivy_garden.matplotlib.backend_kivyagg import FigureCanvasKivyAgg
import matplotlib.patches as patches
import numpy as np
import os
import csv
from datetime import datetime

# MODIFIED: Add this block to prevent Matplotlib from scanning for system fonts on Android
# This resolves a common JNI-related crash.
from kivy.utils import platform

if platform == 'android':
    # Define the path to the bundled font
    font_path = os.path.join(os.path.dirname(__file__), "DejaVuSans.ttf")
    if os.path.exists(font_path):
        plt.rcParams['font.family'] = 'sans-serif'
        plt.rcParams['font.sans-serif'] = [font_path]

import json
import random
from io import BytesIO
import copy

from kivy.app import App
from kivy.clock import Clock
from kivy.core.image import Image as CoreImage
from kivy.graphics import Color, Rectangle, Canvas
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.checkbox import CheckBox
from kivy.uix.dropdown import DropDown
from kivy.uix.gridlayout import GridLayout
from kivy.uix.image import Image
from kivy.uix.label import Label
from kivy.uix.popup import Popup
from kivy.uix.scrollview import ScrollView
from kivy.uix.spinner import Spinner
from kivy.uix.tabbedpanel import TabbedPanel, TabbedPanelItem
from kivy.uix.textinput import TextInput
from kivy.uix.togglebutton import ToggleButton
from kivy.uix.widget import Widget
from kivy.metrics import dp
from PIL import Image as PILImage

from team_balancer import balance_teams
from android_safe_data_manager import AndroidSafeDataManager


# =============================================================================
# Popup Helper Functions
# =============================================================================
def create_scrollable_popup(title, message, size_hint=(0.9, 0.8), debug_info=None):
    """Create a popup with scrollable text content that handles text wrapping properly"""
    
    # Create the main content layout
    content = BoxLayout(orientation='vertical', padding=dp(10), spacing=dp(10))
    
    # Add debug info if provided (for troubleshooting on mobile)
    if debug_info:
        debug_label = Label(
            text=f"[size=12]DEBUG: {debug_info}[/size]",
            markup=True,
            text_size=(None, None),
            size_hint_y=None,
            height=dp(30)
        )
        content.add_widget(debug_label)
    
    # Create scrollable content for the message
    scroll = ScrollView(size_hint=(1, 1))
    
    # Create label with proper text wrapping
    message_label = Label(
        text=message,
        text_size=(None, None),  # Will be set based on scroll width
        halign='left',
        valign='top',
        markup=True
    )
    
    # Bind to set text_size properly for wrapping
    def set_text_size(instance, size):
        message_label.text_size = (size[0] - dp(20), None)  # Leave padding
        message_label.texture_update()
        
    scroll.bind(size=set_text_size)
    scroll.add_widget(message_label)
    content.add_widget(scroll)
    
    # Add OK button
    ok_button = Button(text='OK', size_hint_y=None, height=dp(50))
    content.add_widget(ok_button)
    
    # Create popup
    popup = Popup(
        title=title,
        content=content,
        size_hint=size_hint,
        auto_dismiss=True
    )
    
    # Bind OK button to close popup
    ok_button.bind(on_press=popup.dismiss)
    
    return popup


# =============================================================================
# Custom Widgets & Utility Functions
# =============================================================================
class PillowAnimatedImage(Image):
    def __init__(self, source, **kwargs):
        super().__init__(**kwargs)
        self.source = source
        self.frame_textures = []
        self._load_animation()
        if self.frame_textures:
            self.texture = self.frame_textures[0]
            self.anim_delay = self._get_anim_delay()
            Clock.schedule_interval(self._animate, self.anim_delay)

    def _get_anim_delay(self):
        duration = self._pil_image.info.get('duration', 100)
        return max(0.01, duration / 1000.0)

    def _load_animation(self):
        try:
            self._pil_image = PILImage.open(self.source)
            if not getattr(self._pil_image, 'is_animated', False):
                self.frame_textures = [self.texture]
                return
            for i in range(self._pil_image.n_frames):
                self._pil_image.seek(i)
                frame_rgba = self._pil_image.convert('RGBA')
                data = BytesIO()
                frame_rgba.save(data, format='png')
                data.seek(0)
                im_data = CoreImage(data, ext='png')
                self.frame_textures.append(im_data.texture)
            self.current_frame = 0
        except Exception as e:
            print(f"PillowAnimatedImage: Failed to load {self.source}. Error: {e}")
            self.frame_textures = []

    def _animate(self, dt):
        if not self.frame_textures: return
        self.current_frame = (self.current_frame + 1) % len(self.frame_textures)
        self.texture = self.frame_textures[self.current_frame]


def format_player_name(full_name):
    """Format player name from 'Ravi Nakka' to 'RaviN' format"""
    if not full_name or not str(full_name).strip():
        return str(full_name) if full_name is not None else ""
    
    parts = str(full_name).strip().split()
    if len(parts) == 1:
        return parts[0]  # Single name, return as is
    elif len(parts) == 2:
        first_name = parts[0]
        last_name = parts[1]
        return f"{first_name}{last_name[0]}" if last_name else first_name
    else:
        # More than 2 parts, use first name + first letter of last part
        first_name = parts[0]
        last_name = parts[-1]
        return f"{first_name}{last_name[0]}" if last_name else first_name


def load_last_teams(filename='last_teams.json'):
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return None
    return None


class FullWidthTabbedPanel(TabbedPanel):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.bind(size=self._update_tabs_width, tab_list=self._update_tabs_width)
        self._update_tabs_width()

    def _update_tabs_width(self, *args):
        if not hasattr(self, 'tab_strip'): return
        tabs = self.tab_list
        if not tabs: return
        total_width = self.tab_strip.width
        visible_tabs = [t for t in tabs if not t.disabled]
        if not visible_tabs: return
        tab_width = total_width / len(visible_tabs)

        for tab in self.tab_list:
            if tab.disabled:
                tab.size_hint_x = None
                tab.width = 0
            else:
                tab.size_hint_x = None
                tab.width = tab_width

        self.tab_strip.spacing = 0
        self.tab_strip.padding = [0, 0, 0, 0]

    def add_widget(self, widget, index=0, canvas=None):
        super().add_widget(widget, index=index, canvas=canvas)
        self._update_tabs_width()

    def remove_widget(self, widget):
        super().remove_widget(widget)
        self._update_tabs_width()


# =============================================================================
# PlayerManager (Team Creation and Management)
# =============================================================================
class PlayerManager(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        
        # Create the player list widget that refresh_player_list expects
        from kivy.uix.gridlayout import GridLayout
        player_list = GridLayout(cols=1, spacing=10, size_hint_y=None)
        player_list.bind(minimum_height=player_list.setter('height'))
        
        # Create scroll view to contain the player list
        scroll_view = ScrollView()
        scroll_view.add_widget(player_list)
        
        # Add to main layout and register in ids
        self.add_widget(scroll_view)
        self.ids = {'player_list': player_list}
        
        # Initialize player data and UI state
        self.players = self.load_players()
        self.last_team1 = []
        self.last_team2 = []
        self.last_selected_players = []
        self.toss_popup = None
        self.batting_team = None
        self.bowling_team = None
        self.toss_completed = False

        saved = load_last_teams()
        if saved:
            self.last_team1 = saved.get('team1', [])
            self.last_team2 = saved.get('team2', [])
            self.last_selected_players = saved.get('selected_players', [])
        
        # Refresh the player list now that the widget exists
        self.refresh_player_list()

    def save_last_teams(self, filename='last_teams.json'):
        data = {'team1': self.last_team1, 'team2': self.last_team2, 'selected_players': self.last_selected_players}
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

    def create_last_result_layout(self):
        layout = BoxLayout(orientation='vertical', spacing=10, padding=10)
        self.result_display_label = Label(text="No teams created yet.", markup=True, size_hint_y=None)
        self.result_display_label.bind(texture_size=self.result_display_label.setter('size'))

        button_layout = BoxLayout(orientation='vertical', size_hint_y=None, height=280, spacing=8)
        manual_adjust_btn = Button(text="Manually Adjust Teams", size_hint=(1, None), height=90)
        manual_adjust_btn.bind(on_press=self.manually_adjust_popup)
        recreate_btn = Button(text="Recreate Teams", size_hint=(1, None), height=90)
        recreate_btn.bind(on_press=self.on_recreate)
        toss_btn = Button(text="Toss the coin", size_hint=(1, None), height=90)
        toss_btn.bind(on_press=self.on_toss)

        scroll = ScrollView()
        scroll.add_widget(self.result_display_label)
        layout.add_widget(scroll)

        button_layout.add_widget(manual_adjust_btn)
        button_layout.add_widget(recreate_btn)
        button_layout.add_widget(toss_btn)
        layout.add_widget(button_layout)

        self.update_last_result()
        return layout

    def create_match_setup_layout(self):
        """Combined layout for team creation and management"""
        main_layout = BoxLayout(orientation='vertical', spacing=10, padding=10)
        
        # Quick team creation button
        create_btn = Button(text='Create New Teams', size_hint_y=None, height=100)
        create_btn.bind(on_press=lambda _: self.team_selection_popup())
        main_layout.add_widget(create_btn)
        
        # Current teams display (reuse existing layout)
        teams_layout = self.create_last_result_layout()
        main_layout.add_widget(teams_layout)
        
        return main_layout

    def update_last_result(self):
        if not hasattr(self, 'result_display_label'): return
        if self.last_team1 and self.last_team2:
            team1_str = "\n".join([p.get('name', p) for p in self.last_team1])
            team2_str = "\n".join([p.get('name', p) for p in self.last_team2])
            result_text = f"[b]Team 1[/b]:\n{team1_str}\n\n[b]Team 2[/b]:\n{team2_str}"
            self.result_display_label.text = result_text
        else:
            self.result_display_label.text = "No teams created yet."

    def on_recreate(self, instance):
        if not self.last_selected_players or not self.last_team1 or not self.last_team2:
            popup = create_scrollable_popup(
                title="Recreate Error",
                message="No teams available to recreate.",
                size_hint=(0.8, 0.4)
            )
            popup.open()
            return
        cap1, cap2 = self.last_team1[0], self.last_team2[0]
        players_for_recreation = [p for p in self.last_selected_players if not p.get('is_extra_player')]
        new_team1, new_team2 = balance_teams(players_for_recreation, cap1, cap2)
        self.show_teams_popup(new_team1, new_team2, "Recreated Teams")

    def on_toss(self, instance):
        if not self.last_team1 or not self.last_team2:
            popup = create_scrollable_popup(
                title="Toss Error",
                message="No teams available to toss.",
                size_hint=(0.8, 0.4)
            )
            popup.open()
            return
        if not os.path.exists('toss.gif'):
            self.show_toss_result_immediately()
            return
        gif_image = PillowAnimatedImage(source='toss.gif')
        gif_popup = Popup(title="Tossing...", content=gif_image, size_hint=(None, None), size=('300dp', '300dp'),
                          auto_dismiss=False)
        gif_popup.open()
        total_anim_time = gif_image.anim_delay * len(gif_image.frame_textures) + 0.1
        Clock.schedule_once(lambda dt: (gif_popup.dismiss(), self.show_toss_result_immediately()), total_anim_time)

    def show_toss_result_immediately(self):
        winning_team_num = random.choice([1, 2])
        winning_team_list = self.last_team1 if winning_team_num == 1 else self.last_team2
        captain_name = winning_team_list[0].get('name', 'N/A')
        content = BoxLayout(orientation='vertical', spacing=10, padding=10)
        content.add_widget(
            Label(text=f"Team {winning_team_num} won the toss!\nCaptain: {captain_name}\n\nChoose to Bat or Bowl:",
                  halign='center'))
        buttons = BoxLayout(spacing=10, size_hint_y=None, height=80)
        bat_btn = Button(text='Batting', size_hint_y=None, height=80)
        bowl_btn = Button(text='Bowling', size_hint_y=None, height=80)
        buttons.add_widget(bat_btn)
        buttons.add_widget(bowl_btn)
        content.add_widget(buttons)
        self.toss_popup = Popup(title="Toss Result", content=content, size_hint=(0.8, 0.5), auto_dismiss=False)
        bat_btn.bind(on_press=lambda x: self.prompt_for_scoring('Bat', winning_team_num))
        bowl_btn.bind(on_press=lambda x: self.prompt_for_scoring('Bowl', winning_team_num))
        self.toss_popup.open()

    def prompt_for_scoring(self, choice, winning_team_num):
        if self.toss_popup:
            self.toss_popup.dismiss()
            self.toss_popup = None
        if winning_team_num == 1:
            toss_winner, toss_loser = self.last_team1, self.last_team2
        else:
            toss_winner, toss_loser = self.last_team2, self.last_team1
        self.batting_team = toss_winner if choice == 'Bat' else toss_loser
        self.bowling_team = toss_loser if choice == 'Bat' else toss_winner

        app = App.get_running_app()
        app.scorecard_screen.setup_innings(self.batting_team, self.bowling_team)

        # Show team setup confirmation instead of automatically starting scoring
        self.show_toss_result_summary(choice, winning_team_num)

    def show_toss_result_summary(self, choice, winning_team_num):
        """Show the toss result and directly prompt for overs to start the match"""
        winning_team_list = self.last_team1 if winning_team_num == 1 else self.last_team2
        captain_name = winning_team_list[0].get('name', 'N/A')
        
        batting_team_name = self.batting_team[0]['name'] + "'s Team"
        bowling_team_name = self.bowling_team[0]['name'] + "'s Team"
        
        toss_summary = f"Team {winning_team_num} won the toss!\nCaptain: {captain_name}\nChose to: {choice}\n\n"
        toss_summary += f"Batting: {batting_team_name}\nBowling: {bowling_team_name}\n\n"
        toss_summary += "Enter number of overs to start the match:"
        
        content = BoxLayout(orientation='vertical', spacing=10, padding=10)
        content.add_widget(Label(text=toss_summary, halign='center'))
        
        overs_input = TextInput(text="20", multiline=False, input_filter='int', halign='center', font_size='32sp', size_hint_y=None, height=100)
        content.add_widget(overs_input)
        
        buttons = BoxLayout(spacing=10, size_hint_y=None, height=80)
        start_btn = Button(text='Start Match', size_hint_y=None, height=80)
        cancel_btn = Button(text='Cancel', size_hint_y=None, height=80)
        buttons.add_widget(cancel_btn)
        buttons.add_widget(start_btn)
        content.add_widget(buttons)
        
        popup = Popup(title="Toss Complete - Start Match", content=content, size_hint=(0.8, 0.7), auto_dismiss=False)
        
        def start_match(instance):
            try:
                total_overs = int(overs_input.text)
                if total_overs > 0:
                    popup.dismiss()
                    self.start_scoring_app(self.batting_team, self.bowling_team, total_overs)
                else:
                    popup.title = "Overs must be > 0"
            except ValueError:
                popup.title = "Invalid number"
        
        start_btn.bind(on_press=start_match)
        cancel_btn.bind(on_press=popup.dismiss)
        
        popup.open()

    def start_scoring_app(self, batting_team, bowling_team, total_overs):
        app = App.get_running_app()
        app.start_scoring(batting_team, bowling_team, total_overs=total_overs)

    def load_players(self):
        """Load players from CSV format via AndroidSafeDataManager"""
        try:
            data_manager = AndroidSafeDataManager()
            
            # Load individual player info CSV file
            player_info_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("player_info"))
            if os.path.exists(player_info_file):
                try:
                    import csv
                    with open(player_info_file, 'r', newline='') as file:
                        reader = csv.DictReader(file)
                        player_data = [row for row in reader]
                        return self._convert_csv_to_player_format(player_data)
                except Exception as e:
                    print(f"Error reading player CSV: {e}")
                    pass  # Fall through to empty list
                    
            return []
            
        except Exception as e:
            print(f"Error loading players: {e}")
            return []

    def save_players(self):
        """Save players to CSV format via AndroidSafeDataManager"""
        try:
            data_manager = AndroidSafeDataManager()
            
            # Convert players to CSV format
            player_data_csv = self._convert_players_to_csv_format(self.players)
            
            # Save directly to individual CSV file
            player_info_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("player_info"))
            import csv
            with open(player_info_file, 'w', newline='') as file:
                if player_data_csv:
                    fieldnames = player_data_csv[0].keys()
                    writer = csv.DictWriter(file, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(player_data_csv)
            
        except Exception as e:
            print(f"Error saving players: {e}")
    
    def _convert_csv_to_player_format(self, csv_data):
        """Convert CSV player data to the format expected by the UI"""
        players = []
        for row in csv_data:
            player = {
                'name': row.get('Name', ''),
                'bowling': row.get('Bowling_Style', ''),
                'batting': row.get('Batting_Style', ''),
                'is_star': str(row.get('Is_Star', 'False')).lower() == 'true',
                'last_updated': row.get('Last_Updated', ''),
                'last_edit_date': row.get('Last_Edit_Date', datetime.now().strftime("%Y-%m-%d"))
            }
            players.append(player)
        return players
    
    def _convert_players_to_csv_format(self, players):
        """Convert UI player format to CSV format"""
        csv_data = []
        current_date = datetime.now().strftime("%Y-%m-%d")
        for player in players:
            csv_row = {
                'Name': player.get('name', ''),
                'Bowling_Style': player.get('bowling', ''),
                'Batting_Style': player.get('batting', ''),
                'Is_Star': str(player.get('is_star', False)),
                'Last_Updated': player.get('last_updated', current_date),
                'Last_Edit_Date': current_date  # Always set to current date when saving
            }
            csv_data.append(csv_row)
        return csv_data
    
    def add_player_popup(self):
        content = BoxLayout(orientation='vertical', spacing=5, padding=10)
        name_input = TextInput(hint_text="Name")
        bowl_spinner = Spinner(text='Select Bowling Type', values=['Fast', 'Medium', 'DNB'])
        bat_spinner = Spinner(text='Select Batting Style', values=['R', 'S', 'U'])
        type_spinner = Spinner(text='Select Player Type', values=['Regular', 'Star'])
        add_btn = Button(text='Add Player')
        content.add_widget(name_input)
        content.add_widget(bowl_spinner)
        content.add_widget(bat_spinner)
        content.add_widget(type_spinner)
        content.add_widget(add_btn)
        popup = Popup(title='Add Player', content=content, size_hint=(0.8, 0.7))

        def add_player(instance):
            name = name_input.text.strip()
            if not name or any(p['name'].lower() == name.lower() for p in self.players):
                popup.title = "Name invalid or exists!"
                return
            new_player = {'name': name, 'bowling': bowl_spinner.text, 'batting': bat_spinner.text,
                          'is_star': type_spinner.text == 'Star', 'last_updated': datetime.now().strftime("%Y-%m-%d")}
            self.players.append(new_player)
            self.save_players()
            self.refresh_player_list()
            popup.dismiss()

        add_btn.bind(on_press=add_player)
        popup.open()

    def edit_player_popup(self, player):
        content = BoxLayout(orientation='vertical', spacing=5, padding=10)
        name_input = TextInput(text=player['name'])
        bowl_spinner = Spinner(text=player['bowling'], values=['Fast', 'Medium', 'DNB'])
        bat_spinner = Spinner(text=player['batting'], values=['R', 'S', 'U'])
        type_initial_text = 'Star' if player.get('is_star', False) else 'Regular'
        type_spinner = Spinner(text=type_initial_text, values=['Regular', 'Star'])
        save_btn = Button(text='Save Changes')
        content.add_widget(Label(text="Name"));
        content.add_widget(name_input)
        content.add_widget(Label(text="Bowling Type"));
        content.add_widget(bowl_spinner)
        content.add_widget(Label(text="Batting Style"));
        content.add_widget(bat_spinner)
        content.add_widget(Label(text="Player Type"));
        content.add_widget(type_spinner)
        content.add_widget(save_btn)
        popup = Popup(title='Edit Player', content=content, size_hint=(0.8, 0.8))

        def save_changes(instance):
            player['name'] = name_input.text.strip()
            player['bowling'] = bowl_spinner.text
            player['batting'] = bat_spinner.text
            player['is_star'] = type_spinner.text == 'Star'
            player['last_updated'] = datetime.now().strftime("%Y-%m-%d")
            self.save_players()
            self.refresh_player_list()
            popup.dismiss()

        save_btn.bind(on_press=save_changes)
        popup.open()

    def show_data_sync_popup(self):
        """Show comprehensive data synchronization popup"""
        content = BoxLayout(orientation='vertical', spacing=20, padding=20)
        
        # Device info section with larger fonts
        device_info = self.get_device_info()
        device_label = Label(
            text=f'[size=26][b]Current Device ID:[/b] {device_info["device_id"]}\n[size=26][b]Data Location:[/b] {device_info["data_location"]}[/size]',
            markup=True,
            size_hint_y=None,
            height=100,
            halign='center',
            color=(1, 1, 1, 1)
        )
        device_label.bind(size=device_label.setter('text_size'))
        content.add_widget(device_label)
        
        # Export section
        export_section = BoxLayout(orientation='vertical', spacing=15, size_hint_y=None, height=160)
        export_header = Label(
            text='[size=26][b]Export Data[/b][/size]\n[size=26]Share your cricket data with other devices[/size]',
            markup=True,
            size_hint_y=None,
            height=80,
            halign='center',
            color=(1, 1, 1, 1)
        )
        export_header.bind(size=export_header.setter('text_size'))
        export_section.add_widget(export_header)
        
        export_all_btn = Button(
            text='Export All Data',
            font_size='20sp',
            size_hint_y=None,
            height=80,
            halign='center'
        )
        export_all_btn.bind(on_press=self.export_all_data)
        export_section.add_widget(export_all_btn)
        
        content.add_widget(export_section)
        
        # Import section
        import_section = BoxLayout(orientation='vertical', spacing=15, size_hint_y=None, height=160)
        import_header = Label(
            text='[size=26][b]Import Data[/b][/size]\n[size=26]Load cricket data from other devices[/size]',
            markup=True,
            size_hint_y=None,
            height=80,
            halign='center',
            color=(1, 1, 1, 1)
        )
        import_header.bind(size=import_header.setter('text_size'))
        import_section.add_widget(import_header)
        
        import_stats_btn = Button(
            text='Import All Data',
            font_size='20sp',
            size_hint_y=None,
            height=80,
            halign='center'
        )
        import_stats_btn.bind(on_press=self.import_stats_data)
        import_section.add_widget(import_stats_btn)
        
        content.add_widget(import_section)
        
        # Add spacing before data summary at bottom
        spacer = Label(text='', size_hint_y=None, height=20)
        content.add_widget(spacer)
        
        # Data summary section (at the very bottom)
        summary_section = BoxLayout(orientation='vertical', spacing=10)
        summary_header = Label(
            text='[size=26][b]Current Data Summary[/b][/size]',
            markup=True,
            size_hint_y=None,
            height=50,
            halign='center',
            color=(1, 1, 1, 1)
        )
        summary_header.bind(size=summary_header.setter('text_size'))
        summary_section.add_widget(summary_header)
        
        summary_info = self.get_data_summary()
        summary_label = Label(
            text=summary_info,
            font_size='20sp',
            halign='center',
            color=(0.9, 0.9, 0.9, 1)
        )
        summary_label.bind(size=summary_label.setter('text_size'))
        summary_section.add_widget(summary_label)
        
        content.add_widget(summary_section)
        
        # Close button
        close_btn = Button(
            text='Close',
            font_size='22sp',
            size_hint_y=None,
            height=60,
            background_color=(0.8, 0.3, 0.3, 1)
        )
        content.add_widget(close_btn)
        
        # Create scrollable popup
        scroll_view = ScrollView()
        scroll_view.add_widget(content)
        
        popup = Popup(
            title='Data Synchronization',
            content=scroll_view,
            size_hint=(0.95, 0.9),
            title_size='24sp'
        )
        
        # Bind close button to dismiss popup
        close_btn.bind(on_press=popup.dismiss)
        
        popup.open()
    
    def get_device_info(self):
        """Get current device information"""
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            data_manager = AndroidSafeDataManager()
            return {
                'device_id': data_manager.device_id,
                'data_location': data_manager.data_dir
            }
        except Exception:
            return {
                'device_id': 'Unknown',
                'data_location': 'Current Directory'
            }
    
    def get_data_summary(self):
        """Get summary of current data"""
        summary_lines = []
        
        # Player count
        summary_lines.append(f"Players: {len(self.players)}")
        
        # Player data info
        try:
            data_manager = AndroidSafeDataManager()
            player_info_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("player_info"))
            
            if os.path.exists(player_info_file):
                summary_lines.append("Player Data (CSV): Available")
            else:
                summary_lines.append("Player Data: Not Available")
        except Exception:
            summary_lines.append("Player Data: Unable to check")
        
        # Data files info
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            data_manager = AndroidSafeDataManager()
            
            # Check for individual CSV files
            batting_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("batting"))
            bowling_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("bowling"))
            
            if os.path.exists(batting_file):
                summary_lines.append("Batting Stats (CSV): Available")
            else:
                summary_lines.append("Batting Stats: Not Available")
                
            if os.path.exists(bowling_file):
                summary_lines.append("Bowling Stats (CSV): Available")
            else:
                summary_lines.append("Bowling Stats: Not Available")
                
        except Exception:
            summary_lines.append("Stats Data: Unable to check")
        
        return '\n'.join(summary_lines)
    
    def export_all_data(self, instance):
        """Export all statistical data to CSV files and share via Android share dialog"""
        try:
            from kivy.utils import platform as kivy_platform
            debug_info = f"Platform: {kivy_platform}"
        except ImportError:
            debug_info = "Platform: unknown"
        
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            import os
            
            # Add debugging information
            debug_info += f" | CWD: {os.getcwd()}"
            
            data_manager = AndroidSafeDataManager()
            debug_info += f" | DataDir: {data_manager.data_dir}"
            
            success, message = data_manager.export_stats_for_sharing()
            debug_info += f" | Success: {success}"
            
            if success:
                # Try to use Android sharing if available
                try:
                    from kivy.utils import platform
                    if platform == 'android':
                        debug_info += " | Attempting Android share"
                        self.share_exported_files(data_manager)
                    else:
                        # Desktop fallback - show success with scrollable popup
                        debug_info += " | Desktop mode"
                        popup = create_scrollable_popup(
                            title="Export Success",
                            message=message,
                            size_hint=(0.9, 0.7),
                            debug_info=debug_info
                        )
                        popup.open()
                except Exception as share_error:
                    # Fallback to showing success message if sharing fails
                    debug_info += f" | Share failed: {str(share_error)}"
                    popup = create_scrollable_popup(
                        title="Export Success",
                        message=f"{message}\n\nNote: Could not open share dialog\nError: {str(share_error)}",
                        size_hint=(0.9, 0.7),
                        debug_info=debug_info
                    )
                    popup.open()
            else:
                # Show error with debugging info
                debug_info += f" | Error occurred"
                popup = create_scrollable_popup(
                    title="Export Error",
                    message=message,
                    size_hint=(0.9, 0.6),
                    debug_info=debug_info
                )
                popup.open()
            
        except Exception as e:
            import traceback
            error_msg = f"Export failed: {str(e)}"
            debug_info += f" | Exception: {str(e)}"
            full_trace = traceback.format_exc()
            
            popup = create_scrollable_popup(
                title="Export Error",
                message=f"{error_msg}\n\nFull error details:\n{full_trace}",
                size_hint=(0.9, 0.8),
                debug_info=debug_info
            )
            popup.open()

    def share_exported_files(self, data_manager):
        """Share exported files using Android share dialog (simplified approach)"""
        try:
            import os
            import glob
            
            # Only import Android-specific modules if we're actually on Android
            if platform != 'android':
                print("Android sharing not available on this platform")
                return
                
            try:
                from jnius import autoclass
                from android.runnable import run_on_ui_thread
                
                # Get Android classes
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                Intent = autoclass('android.content.Intent')
                String = autoclass('java.lang.String')
                File = autoclass('java.io.File')
                Uri = autoclass('android.net.Uri')
            except ImportError:
                # Android imports not available - this is expected on desktop
                print("Android sharing not available (not running on Android)")
                return
            ArrayList = autoclass('java.util.ArrayList')
            
            activity = PythonActivity.mActivity
            
            # Find the most recent backup directory in current app folder
            # Look for both current directory and data directory backup patterns
            backup_dirs = []
            
            # Check current directory (where export creates them)
            backup_dirs.extend(glob.glob(os.path.join(".", "cricket_stats_backup_*")))
            
            # Also check data directory as fallback
            try:
                backup_dirs.extend(glob.glob(os.path.join(data_manager.data_dir, "cricket_stats_backup_*")))
            except:
                pass
                
            if not backup_dirs:
                raise Exception("No backup directory found in app folder")
            
            latest_backup = max(backup_dirs, key=os.path.getctime)
            
            # Find CSV files (combined and individual) in the backup directory
            csv_files = glob.glob(os.path.join(latest_backup, "*.csv"))
            json_files = glob.glob(os.path.join(latest_backup, "*.json"))
            all_files = csv_files + json_files
            
            if not all_files:
                raise Exception(f"No files found to share in backup directory: {latest_backup}")
            
            print(f"Found backup directory: {latest_backup}")
            print(f"Files to share: {all_files}")
            
            @run_on_ui_thread
            def share_files():
                try:
                    if len(all_files) == 1:
                        # Single file sharing using file:// URI
                        file_path = all_files[0]
                        java_file = File(file_path)
                        file_uri = Uri.fromFile(java_file)
                        
                        intent = Intent(Intent.ACTION_SEND)
                        # Set appropriate MIME type based on file extension
                        if file_path.endswith('.csv'):
                            intent.setType("text/csv")
                        else:
                            intent.setType("application/json")
                        intent.putExtra(Intent.EXTRA_STREAM, file_uri)
                        intent.putExtra(Intent.EXTRA_SUBJECT, "Cricket Stats Export")
                        intent.putExtra(Intent.EXTRA_TEXT, "Cricket match statistics and data")
                        
                    else:
                        # Multiple files sharing - set CSV type for multiple CSV files
                        intent = Intent(Intent.ACTION_SEND_MULTIPLE)
                        intent.setType("text/csv")
                        
                        uri_list = ArrayList()
                        for file_path in all_files:
                            java_file = File(file_path)
                            file_uri = Uri.fromFile(java_file)
                            uri_list.add(file_uri)
                        
                        intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uri_list)
                        intent.putExtra(Intent.EXTRA_SUBJECT, "Cricket Stats Export")
                        intent.putExtra(Intent.EXTRA_TEXT, "Cricket match statistics and data files")
                    
                    # Create chooser to show sharing apps
                    chooser = Intent.createChooser(intent, String("Share Cricket Stats"))
                    activity.startActivity(chooser)
                    
                except Exception as e:
                    print(f"Error in share_files: {e}")
            
            share_files()
            
        except Exception as e:
            print(f"Error sharing files: {e}")
            raise e

    def import_stats_data(self, instance):
        """Import statistical data from CSV files"""
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            
            # Show processing popup
            processing_label = Label(text="Searching for CSV files in app folder and Downloads...\n(Files from export or shared via WhatsApp)\nPlease wait.", color=(1, 1, 1, 1))
            processing_popup = Popup(title="Importing Data", content=processing_label, size_hint=(0.8, 0.4))
            processing_popup.open()
            
            # Perform the import and merge operation
            data_manager = AndroidSafeDataManager()
            import_summary = data_manager.import_and_merge_external_files()
            
            # Close processing popup
            processing_popup.dismiss()
            
            # Create summary message
            summary_lines = []
            summary_lines.append(f"Import Summary:")
            summary_lines.append(f"Files processed: {import_summary.get('files_processed', 0)}")
            summary_lines.append(f"Records merged: {import_summary.get('records_merged', 0)}")
            
            if import_summary.get('files_processed', 0) > 0:
                summary_lines.append("\nImport completed successfully!")
                summary_lines.append("Data has been merged with existing records.")
            else:
                summary_lines.append("\nNo new files found to import.")
                summary_lines.append("Check Downloads folder for CSV files shared via WhatsApp.")
            
            result_text = '\n'.join(summary_lines)
            
            # Show result popup with scrollable content
            popup = create_scrollable_popup(
                title="Import Complete",
                message=result_text,
                size_hint=(0.9, 0.7)
            )
            popup.open()
            
        except Exception as e:
            import traceback
            error_msg = f"Import failed: {str(e)}"
            full_trace = traceback.format_exc()
            
            popup = create_scrollable_popup(
                title="Import Error",
                message=f"{error_msg}\n\nFull error details:\n{full_trace}",
                size_hint=(0.9, 0.7)
            )
            popup.open()

    def refresh_player_list(self):
        if 'player_list' not in self.ids: return
        self.ids.player_list.clear_widgets()
        for player in sorted(self.players, key=lambda p: p['name']):
            player_button = Button(text=player['name'], size_hint_y=None, height=120)
            player_button.bind(on_press=lambda instance, p=player: self.edit_player_popup(p))
            self.ids.player_list.add_widget(player_button)

    def select_captains_popup(self, selected_players):
        popup_content = BoxLayout(orientation='vertical', spacing=10)
        captain1_spinner = Spinner(text='Select Captain 1', values=[p['name'] for p in selected_players])
        captain2_spinner = Spinner(text='Select Captain 2', values=[p['name'] for p in selected_players])
        confirm_btn = Button(text='Generate Teams')
        popup_content.add_widget(Label(text="Choose Two Captains"))
        popup_content.add_widget(captain1_spinner)
        popup_content.add_widget(captain2_spinner)
        popup_content.add_widget(confirm_btn)
        captain_popup = Popup(title='Select Captains', content=popup_content, size_hint=(0.8, 0.6))

        def confirm_selection(instance):
            cap1 = next((p for p in selected_players if p['name'] == captain1_spinner.text), None)
            cap2 = next((p for p in selected_players if p['name'] == captain2_spinner.text), None)
            if not cap1 or not cap2 or cap1 == cap2:
                captain_popup.title = "Pick two different captains!"
                return
            team1, team2 = balance_teams(selected_players, cap1, cap2)
            self.show_teams_popup(team1, team2, "Balanced Teams")
            captain_popup.dismiss()

        confirm_btn.bind(on_press=confirm_selection)
        captain_popup.open()

    def show_teams_popup(self, team1, team2, title="Balanced Teams"):
        self.last_team1, self.last_team2 = team1, team2
        self.last_selected_players = team1 + team2
        self.save_last_teams()
        self.update_last_result()
        team1_str = "\n".join([p['name'] for p in team1])
        team2_str = "\n".join([p['name'] for p in team2])
        result = f"[b]Team 1[/b]:\n{team1_str}\n\n[b]Team 2[/b]:\n{team2_str}"
        
        # Stay on Match Setup tab until toss is completed
        if hasattr(self, 'main_tab_panel'):
            # Find the Match Setup tab by its text instead of using hardcoded index
            for tab in self.main_tab_panel.tab_list:
                if tab.text == 'Match Setup':
                    if self.main_tab_panel.current_tab != tab:
                        self.main_tab_panel.switch_to(tab)
                    break
        
        content = BoxLayout(orientation='vertical')
        result_label = Label(text=result, markup=True)
        close_btn = Button(text='Close', size_hint_y=None, height=100)
        content.add_widget(result_label)
        content.add_widget(close_btn)
        popup = Popup(title=title, content=content, size_hint=(0.8, 0.8))
        close_btn.bind(on_press=popup.dismiss)
        popup.open()

    def team_selection_popup(self):
        popup_content = BoxLayout(orientation='vertical')
        header_layout = BoxLayout(size_hint_y=None, height=60)
        title_label = Label(text='Select Players for Today', font_size='20sp')
        self.player_count_label = Label(text='(0 selected)', size_hint_x=0.4)
        header_layout.add_widget(title_label)
        header_layout.add_widget(self.player_count_label)

        selection_controls = BoxLayout(size_hint_y=None, height=78, spacing=10)
        select_all_btn = Button(text='Select All')
        unselect_all_btn = Button(text='Unselect All')
        selection_controls.add_widget(select_all_btn)
        selection_controls.add_widget(unselect_all_btn)

        grid = GridLayout(cols=1, size_hint_y=None, spacing=5)
        grid.bind(minimum_height=grid.setter('height'))
        selected_names = set(p['name'] for p in getattr(self, 'last_selected_players', []))
        toggle_buttons = []

        def update_player_count(*args):
            count = sum(1 for tb, p in toggle_buttons if tb.state == 'down')
            self.player_count_label.text = f'({count} selected)'

        for p in sorted(self.players, key=lambda p: p['name']):
            tb = ToggleButton(text=p['name'], size_hint_y=None, height='120dp')
            if p['name'] in selected_names: tb.state = 'down'
            tb.bind(state=update_player_count)
            toggle_buttons.append((tb, p))
            grid.add_widget(tb)
        update_player_count()

        def set_all_states(state):
            for tb, p in toggle_buttons: tb.state = state

        select_all_btn.bind(on_press=lambda x: set_all_states('down'))
        unselect_all_btn.bind(on_press=lambda x: set_all_states('normal'))
        scroll = ScrollView(size_hint=(1, 1))
        scroll.add_widget(grid)

        button_layout = BoxLayout(size_hint_y=None, height=140, spacing=10)
        next_btn = Button(text='Next: Select Captains')
        close_btn = Button(text='Close')
        button_layout.add_widget(next_btn)
        button_layout.add_widget(close_btn)

        popup_content.add_widget(header_layout)
        popup_content.add_widget(selection_controls)
        popup_content.add_widget(scroll)
        popup_content.add_widget(button_layout)

        player_popup = Popup(title='', content=popup_content, size_hint=(0.9, 0.9), title_size=0)
        close_btn.bind(on_press=player_popup.dismiss)

        def go_to_captain_selection(instance):
            selected_players = [p for tb, p in toggle_buttons if tb.state == 'down']
            if len(selected_players) < 2:
                title_label.text = "Select at least 2 players"
                return
            player_popup.dismiss()
            self.select_captains_popup(selected_players)

        next_btn.bind(on_press=go_to_captain_selection)
        player_popup.open()

    def manually_adjust_popup(self, instance):
        if not self.last_team1 or not self.last_team2:
            Popup(title="Adjustment Error", content=Label(text="No teams available to adjust."),
                  size_hint=(0.6, 0.4)).open()
            return

        team1_adj, team2_adj = list(self.last_team1), list(self.last_team2)

        popup_content = BoxLayout(orientation='vertical', spacing=10, padding=10)

        teams_main_layout = BoxLayout(orientation='horizontal', spacing=10)

        team1_layout = BoxLayout(orientation='vertical')
        team1_header_label = Label(text="", size_hint_y=None, height=40, bold=True)
        team1_grid = GridLayout(cols=1, size_hint_y=None, spacing=5)
        team1_grid.bind(minimum_height=team1_grid.setter('height'))
        team1_scroll = ScrollView()
        team1_scroll.add_widget(team1_grid)
        team1_layout.add_widget(team1_header_label)
        team1_layout.add_widget(team1_scroll)

        team2_layout = BoxLayout(orientation='vertical')
        team2_header_label = Label(text="", size_hint_y=None, height=40, bold=True)
        team2_grid = GridLayout(cols=1, size_hint_y=None, spacing=5)
        team2_grid.bind(minimum_height=team2_grid.setter('height'))
        team2_scroll = ScrollView()
        team2_scroll.add_widget(team2_grid)
        team2_layout.add_widget(team2_header_label)
        team2_layout.add_widget(team2_scroll)

        teams_main_layout.add_widget(team1_layout)
        teams_main_layout.add_widget(team2_layout)

        def move_player(player, from_list, to_list, from_grid, to_grid):
            from_list.remove(player)
            to_list.append(player)
            redraw_teams()

        def redraw_teams():
            team1_grid.clear_widgets()
            team2_grid.clear_widgets()

            captain1 = next((p for p in team1_adj if p == self.last_team1[0]), None)
            captain2 = next((p for p in team2_adj if p == self.last_team2[0]), None)
            extra1 = next((p for p in team1_adj if p.get('is_extra_player')), None)
            extra2 = next((p for p in team2_adj if p.get('is_extra_player')), None)

            team1_header_label.text = f"Team 1 ({len(team1_adj)})"
            team2_header_label.text = f"Team 2 ({len(team2_adj)})"

            if captain1:
                team1_grid.add_widget(
                    Button(text=f"{captain1['name']} (C)", size_hint_y=None, height='120dp', disabled=True,
                           background_color=(0.6, 0.6, 0.9, 1)))
            if extra1:
                team1_grid.add_widget(Button(text=extra1['name'], size_hint_y=None, height='120dp', disabled=True,
                                             background_color=(0.8, 0.8, 0.8, 1)))

            other_players1 = [p for p in team1_adj if p not in [captain1, extra1]]
            for p in sorted(other_players1, key=lambda x: x['name']):
                btn = Button(text=p['name'], size_hint_y=None, height='120dp', background_color=(0.7, 0.7, 1, 1))
                btn.bind(on_press=lambda x, pl=p: move_player(pl, team1_adj, team2_adj, team1_grid, team2_grid))
                team1_grid.add_widget(btn)

            if captain2:
                team2_grid.add_widget(
                    Button(text=f"{captain2['name']} (C)", size_hint_y=None, height='120dp', disabled=True,
                           background_color=(0.9, 0.6, 0.6, 1)))
            if extra2:
                team2_grid.add_widget(Button(text=extra2['name'], size_hint_y=None, height='100dp', disabled=True,
                                             background_color=(0.8, 0.8, 0.8, 1)))

            other_players2 = [p for p in team2_adj if p not in [captain2, extra2]]
            for p in sorted(other_players2, key=lambda x: x['name']):
                btn = Button(text=p['name'], size_hint_y=None, height='100dp', background_color=(1, 0.7, 0.7, 1))
                btn.bind(on_press=lambda x, pl=p: move_player(pl, team2_adj, team1_adj, team2_grid, team1_grid))
                team2_grid.add_widget(btn)

        redraw_teams()

        button_layout = BoxLayout(size_hint_y=None, height=120, spacing=10)
        save_btn, cancel_btn = Button(text='Save Changes'), Button(text='Cancel')
        button_layout.add_widget(save_btn)
        button_layout.add_widget(cancel_btn)

        popup_content.add_widget(teams_main_layout)
        popup_content.add_widget(button_layout)

        adjust_popup = Popup(title='Manually Adjust Teams', content=popup_content, size_hint=(0.95, 0.9))

        def save_adjustments(instance):
            self.last_team1, self.last_team2 = team1_adj, team2_adj
            self.save_last_teams()
            self.update_last_result()
            adjust_popup.dismiss()

        save_btn.bind(on_press=save_adjustments)
        cancel_btn.bind(on_press=adjust_popup.dismiss)
        adjust_popup.open()


# =============================================================================
# SCORECARD WIDGETS
# =============================================================================
class SingleInningsScorecard(ScrollView):
    def __init__(self, team_data, **kwargs):
        super().__init__(**kwargs)
        self.team_data = team_data
        self.layout = BoxLayout(orientation='vertical', size_hint_y=None, spacing=20, padding=10)
        self.layout.bind(minimum_height=self.layout.setter('height'))

        self.batting_grid = GridLayout(cols=6, size_hint_y=None)
        self.batting_grid.bind(minimum_height=self.batting_grid.setter('height'))

        self.bowling_grid = GridLayout(cols=6, size_hint_y=None)
        self.bowling_grid.bind(minimum_height=self.bowling_grid.setter('height'))

        self.layout.add_widget(Label(text="Batting", font_size='20sp', bold=True, size_hint_y=None, height=40))
        self.layout.add_widget(self.batting_grid)
        self.layout.add_widget(Label(text="Bowling", font_size='20sp', bold=True, size_hint_y=None, height=40))
        self.layout.add_widget(self.bowling_grid)

        self.add_widget(self.layout)
        self.populate_initial_view()

    def populate_initial_view(self):
        self.batting_grid.clear_widgets()
        self.bowling_grid.clear_widgets()

        def create_wrapping_label(text, **kwargs):
            lbl = Label(text=str(text), markup=True, **kwargs)
            lbl.bind(width=lambda *x: lbl.setter('text_size')(lbl, (lbl.width, None)),
                     texture_size=lambda *x: lbl.setter('height')(lbl, lbl.texture_size[1]))
            return lbl

        bat_headers = ["Batsman", "Dismissal", "R(B)", "4s", "6s", "SR"]
        bat_hints = [0.37, 0.37, 0.06, 0.06, 0.06, 0.08]
        for i, header in enumerate(bat_headers):
            self.batting_grid.add_widget(
                create_wrapping_label(f"[b]{header}[/b]", size_hint_y=None, height=40, size_hint_x=bat_hints[i]))

        for player in self.team_data:
            if player.get('is_extra_player'):
                continue
            self.batting_grid.add_widget(
                create_wrapping_label(format_player_name(player['name']), size_hint_y=None, height=40, size_hint_x=bat_hints[0]))
            self.batting_grid.add_widget(
                create_wrapping_label("not out", size_hint_y=None, height=40, size_hint_x=bat_hints[1]))
            self.batting_grid.add_widget(
                create_wrapping_label("0(0)", size_hint_y=None, height=40, size_hint_x=bat_hints[2]))
            for i in range(3):
                self.batting_grid.add_widget(
                    create_wrapping_label("0", size_hint_y=None, height=40, size_hint_x=bat_hints[i + 3]))

        bowl_headers = ["Bowler", "O", "M", "R", "W", "Econ"]
        bowl_hints = [0.4, 0.12, 0.12, 0.12, 0.12, 0.12]
        for i, header in enumerate(bowl_headers):
            self.bowling_grid.add_widget(
                create_wrapping_label(f"[b]{header}[/b]", size_hint_y=None, height=40, size_hint_x=bowl_hints[i]))

        for player in self.team_data:
            if player.get('is_extra_player'):
                continue
            self.bowling_grid.add_widget(
                create_wrapping_label(format_player_name(player['name']), size_hint_y=None, height=40, size_hint_x=bowl_hints[0]))
            for i in range(5):
                self.bowling_grid.add_widget(
                    create_wrapping_label("0", size_hint_y=None, height=40, size_hint_x=bowl_hints[i + 1]))

    def update_display(self, batsman_scores, bowler_figures, out_players, retired_players, total_score, total_wickets):
        self.batting_grid.clear_widgets()
        self.bowling_grid.clear_widgets()

        def create_wrapping_label(text, **kwargs):
            lbl = Label(text=str(text), markup=True, **kwargs)
            lbl.bind(width=lambda *x: lbl.setter('text_size')(lbl, (lbl.width, None)),
                     texture_size=lambda *x: lbl.setter('height')(lbl, lbl.texture_size[1]))
            return lbl

        bat_headers = ["Batsman", "Dismissal", "R(B)", "4s", "6s", "SR"]
        bat_hints = [0.37, 0.37, 0.06, 0.06, 0.06, 0.08]
        for i, header in enumerate(bat_headers):
            self.batting_grid.add_widget(
                create_wrapping_label(f"[b]{header}[/b]", size_hint_y=None, height=40, size_hint_x=bat_hints[i]))

        for player in self.team_data:
            stats = batsman_scores.get(player['name'])
            if not stats or (stats['B'] == 0 and stats['how_out'] == 'not out'): continue

            self.batting_grid.add_widget(
                create_wrapping_label(format_player_name(player['name']), size_hint_y=None, height=40, size_hint_x=bat_hints[0]))

            dismissal_text = stats.get('how_out', 'not out')
            self.batting_grid.add_widget(
                create_wrapping_label(dismissal_text, size_hint_y=None, height=40, size_hint_x=bat_hints[1]))

            runs = stats.get('R', 0)
            balls = stats.get('B', 0)
            fours = stats.get('4s', 0)
            sixes = stats.get('6s', 0)
            sr = (runs / balls * 100) if balls > 0 else 0

            self.batting_grid.add_widget(
                create_wrapping_label(f"{runs}({balls})", size_hint_y=None, height=40, size_hint_x=bat_hints[2]))
            self.batting_grid.add_widget(
                create_wrapping_label(fours, size_hint_y=None, height=40, size_hint_x=bat_hints[3]))
            self.batting_grid.add_widget(
                create_wrapping_label(sixes, size_hint_y=None, height=40, size_hint_x=bat_hints[4]))
            self.batting_grid.add_widget(
                create_wrapping_label(f"{sr:.0f}", size_hint_y=None, height=40, size_hint_x=bat_hints[5]))

        self.batting_grid.add_widget(create_wrapping_label("[b]Total[/b]", size_hint_y=None, height=40))
        self.batting_grid.add_widget(
            create_wrapping_label(f"{total_score}/{total_wickets}", size_hint_y=None, height=40))
        for _ in range(4):
            self.batting_grid.add_widget(create_wrapping_label("", size_hint_y=None, height=40))

        bowl_headers = ["Bowler", "O", "M", "R", "W", "Econ"]
        bowl_hints = [0.4, 0.12, 0.12, 0.12, 0.12, 0.12]
        for i, header in enumerate(bowl_headers):
            self.bowling_grid.add_widget(
                create_wrapping_label(f"[b]{header}[/b]", size_hint_y=None, height=40, size_hint_x=bowl_hints[i]))

        for player_name, stats in bowler_figures.items():
            if stats['B'] == 0: continue

            self.bowling_grid.add_widget(
                create_wrapping_label(format_player_name(player_name), size_hint_y=None, height=40, size_hint_x=bowl_hints[0]))

            total_balls = stats.get('B', 0)
            overs_bowled = f"{total_balls // 6}.{total_balls % 6}"
            maidens = stats.get('M', 0)
            runs_conceded = stats.get('R', 0)
            wickets_taken = stats.get('W', 0)
            econ = (runs_conceded / (total_balls / 6)) if total_balls > 0 else 0

            self.bowling_grid.add_widget(
                create_wrapping_label(overs_bowled, size_hint_y=None, height=40, size_hint_x=bowl_hints[1]))
            self.bowling_grid.add_widget(
                create_wrapping_label(maidens, size_hint_y=None, height=40, size_hint_x=bowl_hints[2]))
            self.bowling_grid.add_widget(
                create_wrapping_label(runs_conceded, size_hint_y=None, height=40, size_hint_x=bowl_hints[3]))
            self.bowling_grid.add_widget(
                create_wrapping_label(wickets_taken, size_hint_y=None, height=40, size_hint_x=bowl_hints[4]))
            self.bowling_grid.add_widget(
                create_wrapping_label(f"{econ:.2f}", size_hint_y=None, height=40, size_hint_x=bowl_hints[5]))


class ScorecardScreen(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.tab_panel = FullWidthTabbedPanel(do_default_tab=False, tab_pos='top_mid')
        self.tab_panel.tab_height = '60dp'
        self.tab_panel.tab_width = '120dp'
        self.add_widget(self.tab_panel)
        self.innings1_widget = None
        self.innings2_widget = None
        self.team1_data = None
        self.team2_data = None

    def setup_innings(self, team1_data, team2_data):
        self.tab_panel.clear_tabs()
        self.team1_data = team1_data
        self.team2_data = team2_data

        team1_name = team1_data[0]['name'] + "'s Team"
        tab1 = TabbedPanelItem(text=team1_name)
        self.innings1_widget = SingleInningsScorecard(team1_data)
        tab1.add_widget(self.innings1_widget)
        self.tab_panel.add_widget(tab1)

        team2_name = team2_data[0]['name'] + "'s Team"
        tab2 = TabbedPanelItem(text=team2_name)
        self.innings2_widget = SingleInningsScorecard(team2_data)
        tab2.add_widget(self.innings2_widget)
        self.tab_panel.add_widget(tab2)

    def update_data(self, current_batting_team_data, batsman_scores, bowler_figures, out_players, retired_players,
                    total_score, total_wickets):
        if self.team1_data and current_batting_team_data[0]['name'] == self.team1_data[0]['name']:
            self.innings1_widget.update_display(batsman_scores, bowler_figures, out_players, retired_players,
                                                total_score, total_wickets)
        elif self.team2_data:
            self.innings2_widget.update_display(batsman_scores, bowler_figures, out_players, retired_players,
                                                total_score, total_wickets)


# =============================================================================
# SCORING ENGINE CLASS
# =============================================================================
class ScoringScreen(BoxLayout):
    def __init__(self, batting_team, bowling_team, scorecard_widget, target_score=None, total_overs=20, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.batting_team_data = batting_team
        self.bowling_team_data = bowling_team
        self.scorecard_widget = scorecard_widget
        self.target_score = target_score
        self.total_overs = total_overs
        self.active_extra = None
        self.match_won = False

        self.batsman_stat_widgets = []
        self.bowler_stat_widgets = []

        self.init_match_state()
        self._build_ui()
        self.select_opening_players()

    def init_match_state(self):
        self.score = 0
        self.wickets = 0
        self.overs = 0
        self.balls_in_over = 0
        self.total_balls_bowled = 0
        self.history_stack = []
        self.striker = None
        self.non_striker = None
        self.bowler = None
        self.out_players = []
        self.retired_players = []
        self.current_over_events = []
        self.runs_in_current_over_for_maiden = 0
        self.game_started = False
        self.over_scores = [0]
        self.wicket_events = []
        self.batsman_scores = {p['name']: {'R': 0, 'B': 0, '4s': 0, '6s': 0, 'how_out': 'not out'} for p in
                               self.batting_team_data}
        self.bowler_figures = {p['name']: {'O': 0.0, 'B': 0, 'M': 0, 'R': 0, 'W': 0} for p in self.bowling_team_data}

    def _build_ui(self):
        self.clear_widgets()

        main_layout = BoxLayout(orientation='vertical', spacing=10, padding=10)

        top_container = BoxLayout(orientation='vertical', size_hint=(1, 1), spacing=10)

        self.team_name_label = Label(text=f"{self.batting_team_data[0]['name']}'s Team", font_size='24sp', bold=True,
                                     size_hint_y=0.1)
        top_container.add_widget(self.team_name_label)

        score_overs_layout = BoxLayout(size_hint_y=0.15)
        self.score_label = Label(font_size='32sp', bold=True, halign='left', valign='middle')
        self.score_label.bind(size=self.score_label.setter('text_size'))
        self.overs_label = Label(font_size='24sp', bold=True, halign='right', valign='middle')
        self.overs_label.bind(size=self.overs_label.setter('text_size'))
        score_overs_layout.add_widget(self.score_label)
        score_overs_layout.add_widget(self.overs_label)
        top_container.add_widget(score_overs_layout)

        run_rates_layout = BoxLayout(size_hint_y=0.15)
        self.rrr_label = Label(font_size='20sp', color=(1, 0.2, 0.2, 1), halign='left', valign='middle')
        self.rrr_label.bind(size=self.rrr_label.setter('text_size'))
        self.crr_label = Label(font_size='20sp', halign='right', valign='middle')
        self.crr_label.bind(size=self.crr_label.setter('text_size'))
        run_rates_layout.add_widget(self.rrr_label)
        run_rates_layout.add_widget(self.crr_label)
        if self.target_score is None:
            self.rrr_label.opacity = 0

        scroller = ScrollView(size_hint_y=1.0)
        scroll_content = BoxLayout(orientation='vertical', spacing=20, size_hint_y=None, padding=[0, 10, 0, 0])
        scroll_content.bind(minimum_height=scroll_content.setter('height'))

        scroll_content.add_widget(Label(text=" ", font_size='20sp', bold=True, size_hint_y=None, height=30))
        self.batsman_stats_grid = GridLayout(cols=6, size_hint_y=None, spacing=(5, 68))
        self.batsman_stats_grid.bind(minimum_height=self.batsman_stats_grid.setter('height'))
        headers = ["Batsman", "R", "B", "4s", "6s", "SR"]
        for header in headers:
            self.batsman_stats_grid.add_widget(Label(text=f"[b]{header}[/b]", markup=True, size_hint_y=None, height=30))
        scroll_content.add_widget(self.batsman_stats_grid)

        scroll_content.add_widget(Label(text=" ", font_size='20sp', bold=True, size_hint_y=None, height=30))
        self.bowler_stats_grid = GridLayout(cols=6, size_hint_y=None, spacing=(5, 68))
        self.bowler_stats_grid.bind(minimum_height=self.bowler_stats_grid.setter('height'))
        headers = ["Bowler", "O", "M", "R", "W", "Econ"]
        for header in headers:
            self.bowler_stats_grid.add_widget(Label(text=f"[b]{header}[/b]", markup=True, size_hint_y=None, height=30))
        scroll_content.add_widget(self.bowler_stats_grid)

        scroller.add_widget(scroll_content)
        top_container.add_widget(scroller)

        self.this_over_label = Label(font_size='18sp', bold=True, size_hint_y=0.1, halign='left', valign='middle')
        self.this_over_label.bind(size=self.this_over_label.setter('text_size'))
        top_container.add_widget(self.this_over_label)

        main_layout.add_widget(top_container)

        bottom_controls = BoxLayout(orientation='vertical', size_hint_y=None, height=576, spacing=20)

        scoring_extras_layout = GridLayout(cols=4, spacing=10, size_hint_y=None, height=384)
        for i in range(7):
            btn = Button(text=str(i), font_size='38sp')
            btn.bind(on_press=self.handle_run_button)
            scoring_extras_layout.add_widget(btn)
        scoring_extras_layout.add_widget(Widget())

        self.extra_buttons = {}
        for extra in ['Wd', 'Nb', 'Bye', 'OUT']:
            btn = ToggleButton(text=extra, group='extras', font_size='29sp') if extra != 'OUT' else Button(text=extra,
                                                                                                           font_size='29sp')
            btn.background_color = (0.9, 0.2, 0.2, 1) if extra == 'OUT' else (0.2, 0.6, 0.9, 1)
            if extra != 'OUT':
                btn.bind(state=self.set_active_extra)
            else:
                btn.bind(on_press=self.prompt_who_out)
            scoring_extras_layout.add_widget(btn)
            if extra != 'OUT': self.extra_buttons[extra] = btn

        bottom_controls.add_widget(scoring_extras_layout)

        controls = GridLayout(cols=3, size_hint_y=None, height=172, spacing=10)
        controls.add_widget(Button(text="Undo", on_press=self.undo, font_size='24sp'))
        controls.add_widget(Button(text="Swap", on_press=self.swap_batsmen, font_size='24sp'))
        controls.add_widget(Button(text="Retire", on_press=self.retire_batsman_popup, font_size='24sp'))
        bottom_controls.add_widget(controls)

        main_layout.add_widget(bottom_controls)
        self.add_widget(main_layout)

    def set_active_extra(self, instance, value):
        if value == 'down':
            self.active_extra = instance.text
        else:
            self.active_extra = None

    def save_state(self):
        keys_to_save = [
            'score', 'wickets', 'overs', 'balls_in_over', 'total_balls_bowled',
            'striker', 'non_striker', 'bowler', 'out_players', 'retired_players',
            'current_over_events', 'runs_in_current_over_for_maiden',
            'batsman_scores', 'bowler_figures', 'game_started', 'active_extra', 'match_won',
            'over_scores', 'wicket_events'
        ]
        state = {key: copy.deepcopy(getattr(self, key)) for key in keys_to_save}
        self.history_stack.append(state)

    def load_state(self, state):
        for key, value in state.items(): setattr(self, key, value)
        self.update_display()

    def undo(self, instance):
        if not self.history_stack:
            if not self.game_started:
                self.select_opening_players()
            else:
                Popup(title="Undo", content=Label(text="No history to undo."), size_hint=(0.6, 0.3)).open()
            return
        self.load_state(self.history_stack.pop())

    def update_display(self):
        self.score_label.text = f"  {self.score}/{self.wickets}"
        self.overs_label.text = f"Overs: {self.overs}.{self.balls_in_over}  "

        self.crr_label.text = f"CRR: {(self.score / self.total_balls_bowled * 6):.2f}  " if self.total_balls_bowled > 0 else "CRR: 0.00  "
        if self.target_score is not None:
            self.rrr_label.opacity = 1
            runs_to_win = self.target_score + 1
            runs_needed = runs_to_win - self.score
            balls_remaining = (self.total_overs * 6) - self.total_balls_bowled
            if runs_needed <= 0:
                self.rrr_label.text = "  Target Reached!"
            elif balls_remaining > 0:
                rrr = (runs_needed / balls_remaining) * 6
                self.rrr_label.text = f"  RRR: {rrr:.2f}"
            else:
                self.rrr_label.text = "  RRR: ---"
        else:
            self.rrr_label.opacity = 0

        for w in self.batsman_stat_widgets:
            self.batsman_stats_grid.remove_widget(w)
        self.batsman_stat_widgets.clear()

        for p in [self.striker, self.non_striker]:
            if not p:
                for _ in range(6):
                    lbl = Label(text="-")
                    self.batsman_stats_grid.add_widget(lbl)
                    self.batsman_stat_widgets.append(lbl)
                continue

            stats = self.batsman_scores[p['name']]
            sr = (stats['R'] / stats['B'] * 100) if stats['B'] > 0 else 0
            player_name_text = f"{format_player_name(p['name'])}*" if p == self.striker else format_player_name(p['name'])

            player_widgets = [
                Label(text=player_name_text, halign='center'),
                Label(text=str(stats['R']), halign='center'), Label(text=str(stats['B']), halign='center'),
                Label(text=str(stats['4s']), halign='center'), Label(text=str(stats['6s']), halign='center'),
                Label(text=f"{sr:.0f}", halign='center')
            ]
            for widget in player_widgets:
                self.batsman_stats_grid.add_widget(widget)
                self.batsman_stat_widgets.append(widget)

        for w in self.bowler_stat_widgets:
            self.bowler_stats_grid.remove_widget(w)
        self.bowler_stat_widgets.clear()

        if self.bowler:
            stats = self.bowler_figures[self.bowler['name']]
            total_balls = stats['B']
            econ = (stats['R'] / (total_balls / 6)) if total_balls > 0 else 0
            overs_bowled = f"{total_balls // 6}.{total_balls % 6}"

            bowler_widgets = [
                Label(text=format_player_name(self.bowler['name']), halign='center'), Label(text=overs_bowled, halign='center'),
                Label(text=str(stats['M']), halign='center'), Label(text=str(stats['R']), halign='center'),
                Label(text=str(stats['W']), halign='center'), Label(text=f"{econ:.2f}", halign='center')
            ]
            for widget in bowler_widgets:
                self.bowler_stats_grid.add_widget(widget)
                self.bowler_stat_widgets.append(widget)

        self.this_over_label.text = f"  This Over: {'  '.join(self.current_over_events)}"

        if self.scorecard_widget:
            self.scorecard_widget.update_data(self.batting_team_data, self.batsman_scores, self.bowler_figures,
                                              self.out_players, self.retired_players, self.score, self.wickets)

    def check_for_win(self):
        if self.target_score is not None and self.score > self.target_score and not self.match_won:
            self.match_won = True
            self.prompt_finish_match()

    def prompt_finish_match(self):
        content = BoxLayout(orientation='vertical', spacing=10, padding=10)
        content.add_widget(Label(text="Target reached! Do you want to finish the match?"))
        buttons = BoxLayout(spacing=10, size_hint_y=None, height=60)
        finish_btn = Button(text='Finish Match')
        continue_btn = Button(text='Continue')
        buttons.add_widget(finish_btn)
        buttons.add_widget(continue_btn)
        content.add_widget(buttons)
        popup = Popup(title="Match Won", content=content, size_hint=(0.8, 0.5), auto_dismiss=False)

        finish_btn.bind(on_press=lambda x: (self.end_innings_popup(), popup.dismiss()))
        continue_btn.bind(on_press=popup.dismiss)
        popup.open()

    def handle_run_button(self, instance):
        runs = int(instance.text)
        self.save_state()
        if self.active_extra:
            self.handle_extra_runs(self.active_extra, runs)
        else:
            self.process_ball(runs=runs)
        self.check_for_win()

    def handle_extra_runs(self, extra_type, runs_scored):
        base_extra_runs = 1
        self.score += base_extra_runs + runs_scored
        self.runs_in_current_over_for_maiden += base_extra_runs + runs_scored

        if extra_type == 'Nb':
            self.bowler_figures[self.bowler['name']]['R'] += base_extra_runs + runs_scored
            self.batsman_scores[self.striker['name']]['R'] += runs_scored
            self.batsman_scores[self.striker['name']]['B'] += 1
        elif extra_type == 'Wd':
            self.bowler_figures[self.bowler['name']]['R'] += base_extra_runs + runs_scored
        elif extra_type == 'Bye':
            self.batsman_scores[self.striker['name']]['B'] += 1
            self.add_ball()

        display_extra = {'Bye': 'B'}.get(extra_type, extra_type)
        self.current_over_events.append(f"{runs_scored}{display_extra}")

        # Strike rotation: Only on runs scored by batsmen, not on the extra run from Nb/Wd
        runs_for_rotation = runs_scored
        if runs_for_rotation % 2 != 0:
            self.swap_batsmen(save=False)

        if self.extra_buttons.get(self.active_extra):
            self.extra_buttons[self.active_extra].state = 'normal'
        self.active_extra = None
        self.update_display()
        self.check_for_win()

    def process_ball(self, runs=0, is_legal_delivery=True):
        if not self.striker or not self.bowler: return
        self.score += runs
        self.batsman_scores[self.striker['name']]['R'] += runs
        self.bowler_figures[self.bowler['name']]['R'] += runs
        self.runs_in_current_over_for_maiden += runs
        if runs == 4: self.batsman_scores[self.striker['name']]['4s'] += 1
        if runs == 6: self.batsman_scores[self.striker['name']]['6s'] += 1
        self.current_over_events.append(str(runs))
        if is_legal_delivery:
            self.batsman_scores[self.striker['name']]['B'] += 1
            self.add_ball()
        if runs % 2 != 0: self.swap_batsmen(save=False)
        self.update_display()

    def prompt_who_out(self, instance=None):
        self.save_state()
        content = BoxLayout(orientation='vertical', spacing=10, padding=10)

        runs_layout = BoxLayout(size_hint_y=None, height=40)
        runs_layout.add_widget(Label(text="Runs on ball (for run out):"))
        runs_input = TextInput(text="0", multiline=False, input_filter='int', halign='center')
        runs_layout.add_widget(runs_input)
        content.add_widget(runs_layout)

        batsman_selection = GridLayout(cols=2, spacing=10)
        popup = Popup(title="Who Got Out?", content=content, size_hint=(0.8, 0.6), auto_dismiss=False)

        def select_batsman_out(batsman_out):
            try:
                runs = int(runs_input.text)
            except ValueError:
                runs = 0
            popup.dismiss()
            self.prompt_dismissal_type(batsman_out, runs_on_ball=runs)

        if self.striker:
            striker_btn = Button(text=format_player_name(self.striker['name']))
            striker_btn.bind(on_press=lambda x: select_batsman_out(self.striker))
            batsman_selection.add_widget(striker_btn)
        if self.non_striker:
            non_striker_btn = Button(text=format_player_name(self.non_striker['name']))
            non_striker_btn.bind(on_press=lambda x: select_batsman_out(self.non_striker))
            batsman_selection.add_widget(non_striker_btn)

        content.add_widget(batsman_selection)
        popup.open()

    def prompt_dismissal_type(self, batsman_out, runs_on_ball=0):
        content = GridLayout(cols=2, spacing=10, padding=10)
        popup = Popup(title="How Out?", content=content, size_hint=(0.8, 0.6), auto_dismiss=False)
        dismissals = ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket']
        for d in dismissals:
            btn = Button(text=d)
            btn.bind(on_press=lambda x, dt=d: (
                self.process_dismissal(batsman_out, dt, runs_on_ball=runs_on_ball), popup.dismiss()))
            content.add_widget(btn)
        popup.open()

    def process_dismissal(self, batsman_out, dismissal_type, runs_on_ball=0):
        needs_fielder = ['Caught', 'Run Out', 'Stumped']
        if dismissal_type in needs_fielder:
            self.prompt_fielder(batsman_out, dismissal_type, runs_on_ball=runs_on_ball)
        else:
            self.finalize_wicket(batsman_out, dismissal_type, runs_on_ball=runs_on_ball)

    def prompt_fielder(self, batsman_out, dismissal_type, runs_on_ball=0):
        content = BoxLayout(orientation='vertical')
        grid = GridLayout(cols=1, size_hint_y=None, spacing=5)
        grid.bind(minimum_height=grid.setter('height'))
        popup = Popup(title=f"Fielder for {dismissal_type}", content=content, size_hint=(0.8, 0.9), auto_dismiss=False)
        for p in self.bowling_team_data:
            btn = Button(text=format_player_name(p['name']), size_hint_y=None, height=100)
            btn.bind(on_press=lambda x, f=p: (
                self.finalize_wicket(batsman_out, dismissal_type, fielder=f, runs_on_ball=runs_on_ball),
                popup.dismiss()))
            grid.add_widget(btn)

        scroll = ScrollView()
        scroll.add_widget(grid)
        content.add_widget(scroll)
        popup.open()

    def finalize_wicket(self, batsman_out, dismissal_type, fielder=None, runs_on_ball=0):
        if runs_on_ball > 0:
            self.score += runs_on_ball
            self.batsman_scores[batsman_out['name']]['R'] += runs_on_ball
            self.bowler_figures[self.bowler['name']]['R'] += runs_on_ball
            self.runs_in_current_over_for_maiden += runs_on_ball
            if runs_on_ball % 2 != 0: self.swap_batsmen(save=False)

        batsman_name = batsman_out['name']
        dismissal_text = ""
        if dismissal_type == 'Caught':
            dismissal_text = f"c {fielder['name']} b {self.bowler['name']}"
        elif dismissal_type == 'Stumped':
            dismissal_text = f"st {fielder['name']} b {self.bowler['name']}"
        elif dismissal_type == 'Run Out':
            dismissal_text = f"run out ({fielder['name']})"
        elif dismissal_type in ['Bowled', 'LBW', 'Hit Wicket']:
            dismissal_text = f"b {self.bowler['name']}"
        else:
            dismissal_text = dismissal_type
        self.batsman_scores[batsman_name]['how_out'] = dismissal_text

        self.wickets += 1
        if dismissal_type != 'Run Out': self.bowler_figures[self.bowler['name']]['W'] += 1

        self.batsman_scores[batsman_name]['B'] += 1

        self.wicket_events.append({'over': self.overs, 'score': self.score})

        event_string = f"{runs_on_ball}W" if runs_on_ball > 0 else "W"
        self.current_over_events.append(event_string)
        self.out_players.append(batsman_out)

        self.balls_in_over += 1
        self.total_balls_bowled += 1
        self.bowler_figures[self.bowler['name']]['B'] += 1

        num_batting_players = len(self.batting_team_data)
        if self.wickets >= num_batting_players - 1 or self.overs >= self.total_overs:
            self.end_innings_popup()
            self.update_display()
            return

        is_over_complete = self.balls_in_over == 6

        def select_new_batsman_and_bowler():
            new_batsman_callback = self.set_new_striker if batsman_out == self.striker else self.set_new_non_striker
            excluded = [self.non_striker] if batsman_out == self.striker else [self.striker]

            def chained_bowler_popup(player):
                new_batsman_callback(player)
                if self.overs < self.total_overs:
                    self.select_player_popup("Select New Bowler", self.bowling_team_data, self.set_bowler,
                                             [self.bowler])
                else:
                    self.end_innings_popup()

            self.select_player_popup("Select New Batsman", self.batting_team_data, chained_bowler_popup,
                                     players_to_exclude=excluded)

        if is_over_complete:
            if self.runs_in_current_over_for_maiden == 0: self.bowler_figures[self.bowler['name']]['M'] += 1
            self.over_scores.append(self.score)
            self.balls_in_over = 0;
            self.overs += 1
            self.current_over_events = [];
            self.runs_in_current_over_for_maiden = 0
            self.swap_batsmen(save=False)

            if self.overs >= self.total_overs:
                self.end_innings_popup()
            else:
                select_new_batsman_and_bowler()
        else:
            if batsman_out == self.striker:
                self.select_player_popup("Select New Batsman", self.batting_team_data, self.set_new_striker,
                                         players_to_exclude=[self.non_striker])
            else:
                self.select_player_popup("Select New Batsman", self.batting_team_data, self.set_new_non_striker,
                                         players_to_exclude=[self.striker])

        self.update_display()

    def add_ball(self):
        self.balls_in_over += 1
        self.total_balls_bowled += 1
        self.bowler_figures[self.bowler['name']]['B'] += 1
        if self.balls_in_over == 6:
            if self.runs_in_current_over_for_maiden == 0: self.bowler_figures[self.bowler['name']]['M'] += 1

            self.over_scores.append(self.score)

            self.balls_in_over = 0
            self.overs += 1
            self.current_over_events = []
            self.runs_in_current_over_for_maiden = 0

            if self.overs >= self.total_overs:
                self.end_innings_popup()
                return

            self.swap_batsmen(save=False)
            self.select_player_popup("Select New Bowler", self.bowling_team_data, self.set_bowler, [self.bowler])

    def set_bowler(self, player):
        self.bowler = player
        self.update_display()

    def select_opening_players(self):
        self.init_match_state()
        self.save_state()
        self.select_player_popup("Select Striker", self.batting_team_data, self.set_striker)

    def set_striker(self, player):
        if player in self.retired_players:
            self.retired_players.remove(player)
        self.striker = player
        self.select_player_popup("Select Non-Striker", self.batting_team_data, self.set_non_striker, [self.striker])

    def set_non_striker(self, player):
        if player in self.retired_players:
            self.retired_players.remove(player)
        self.non_striker = player
        self.select_player_popup("Select Opening Bowler", self.bowling_team_data, self.set_bowler,
                                 setup_complete_callback=self.finish_setup)

    def finish_setup(self):
        self.game_started = True
        self.update_display()

    def select_player_popup(self, title, player_list, callback, players_to_exclude=None, setup_complete_callback=None):
        content = BoxLayout(orientation='vertical')
        grid = GridLayout(cols=1, size_hint_y=None, spacing=5)
        grid.bind(minimum_height=grid.setter('height'))

        excluded_names = [p['name'] for p in (self.out_players + (players_to_exclude or [])) if p]

        is_bowler_selection = 'Bowler' in title
        if is_bowler_selection:
            available_players = [p for p in player_list if
                                 p['name'] not in excluded_names and not p.get('is_extra_player')]
        else:
            available_players = [p for p in player_list if p['name'] not in excluded_names]

        popup = Popup(title=title, content=content, size_hint=(0.8, 0.9), auto_dismiss=False)
        for p in available_players:
            btn = Button(text=format_player_name(p['name']), size_hint_y=None, height='100dp')

            def on_select(instance, player=p):
                callback(player)
                popup.dismiss()
                if setup_complete_callback: setup_complete_callback()

            btn.bind(on_press=on_select)
            grid.add_widget(btn)

        scroll = ScrollView()
        scroll.add_widget(grid)
        content.add_widget(scroll)
        popup.open()

    def end_innings_popup(self):
        app = App.get_running_app()
        app.store_innings_data(self.batting_team_data, self.batsman_scores, self.bowler_figures, self.score,
                               self.wickets, self.over_scores, self.wicket_events, self.total_balls_bowled)

        if app.is_second_innings:
            app.finish_and_analyze_match()
            return

        content = BoxLayout(orientation='vertical', spacing=10, padding=10)
        content.add_widget(Label(text=f"Innings Over\nFinal Score: {self.score}/{self.wickets}"))
        buttons = BoxLayout(spacing=10, size_hint_y=None, height=60)
        next_inning_btn = Button(text='Start Next Innings')
        end_match_btn = Button(text='End Match')
        buttons.add_widget(next_inning_btn)
        buttons.add_widget(end_match_btn)
        content.add_widget(buttons)
        popup = Popup(title="Innings Over", content=content, size_hint=(0.8, 0.5), auto_dismiss=False)

        def handle_next_innings(instance):
            popup.dismiss()
            app.start_second_innings(self.bowling_team_data, self.batting_team_data, target_score=self.score,
                                     total_overs=self.total_overs)

        next_inning_btn.bind(on_press=handle_next_innings)
        end_match_btn.bind(on_press=lambda x: (setattr(app, 'is_second_innings', False), popup.dismiss()))
        popup.open()

    def swap_batsmen(self, instance=None, save=True):
        if save: self.save_state()
        self.striker, self.non_striker = self.non_striker, self.striker
        self.update_display()

    def retire_batsman_popup(self, instance):
        self.save_state()
        content = BoxLayout(orientation='vertical', spacing=10)
        popup = Popup(title="Who is retiring?", content=content, size_hint=(0.6, 0.4))

        if self.striker and not self.striker.get('is_extra_player'):
            striker_btn = Button(text=self.striker['name'])
            striker_btn.bind(on_press=lambda x: (self.retire_player(self.striker), popup.dismiss()))
            content.add_widget(striker_btn)
        if self.non_striker and not self.non_striker.get('is_extra_player'):
            non_striker_btn = Button(text=self.non_striker['name'])
            non_striker_btn.bind(on_press=lambda x: (self.retire_player(self.non_striker), popup.dismiss()))
            content.add_widget(non_striker_btn)
        popup.open()

    def retire_player(self, player_to_retire):
        self.retired_players.append(player_to_retire)
        if self.striker == player_to_retire:
            self.select_player_popup("Select New Batsman", self.batting_team_data, self.set_new_striker,
                                     players_to_exclude=[self.non_striker])
        else:
            self.non_striker = None
            self.select_player_popup("Select New Batsman", self.batting_team_data, self.set_new_non_striker,
                                     players_to_exclude=[self.striker])

    def set_new_striker(self, player):
        if player in self.retired_players:
            self.retired_players.remove(player)
        self.striker = player
        self.update_display()

    def set_new_non_striker(self, player):
        if player in self.retired_players:
            self.retired_players.remove(player)
        self.non_striker = player
        self.update_display()


# =============================================================================
# ANALYSIS WIDGET
# =============================================================================
class AnalysisScreen(ScrollView):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Keep consistent with other tabs - no custom background
        
        self.layout = BoxLayout(orientation='vertical', size_hint_y=None, spacing=30, padding=15)
        self.layout.bind(minimum_height=self.layout.setter('height'))
        self.add_widget(self.layout)
        self.chart_placeholder = BoxLayout(size_hint_y=None, height=450)
        self.analysis_text_layout = BoxLayout(orientation='vertical', size_hint_y=None, spacing=20)
        self.analysis_text_layout.bind(minimum_height=self.analysis_text_layout.setter('height'))

        self.layout.add_widget(self.chart_placeholder)
        self.layout.add_widget(self.analysis_text_layout)

    def generate_analysis(self, innings1_data, innings2_data):
        self.chart_placeholder.clear_widgets()
        self.analysis_text_layout.clear_widgets()
        plt.clf()

        fig, ax = plt.subplots()
        team1_name = innings1_data['team_data'][0]['name'].split()[0] + "'s Team"
        team2_name = innings2_data['team_data'][0]['name'].split()[0] + "'s Team"

        line1 = ax.plot(range(len(innings1_data['over_scores'])), innings1_data['over_scores'], marker='o',
                        label=team1_name, markersize=4, zorder=10)
        team1_color = line1[0].get_color()
        line2 = ax.plot(range(len(innings2_data['over_scores'])), innings2_data['over_scores'], marker='o',
                        label=team2_name, markersize=4, zorder=10)
        team2_color = line2[0].get_color()

        if innings1_data.get('wicket_events'):
            w_overs1 = [w['over'] for w in innings1_data['wicket_events']]
            w_scores1 = [w['score'] for w in innings1_data['wicket_events']]
            ax.scatter(w_overs1, w_scores1, color=team1_color, marker='o', s=60, zorder=12, edgecolor='black')

        if innings2_data.get('wicket_events'):
            w_overs2 = [w['over'] for w in innings2_data['wicket_events']]
            w_scores2 = [w['score'] for w in innings2_data['wicket_events']]
            ax.scatter(w_overs2, w_scores2, color=team2_color, marker='o', s=60, zorder=12, edgecolor='black')

        ax.set_title("Score Progression Chart", fontsize=18)
        ax.set_xlabel("Overs", fontsize=14)
        ax.set_ylabel("Cumulative Runs", fontsize=14)
        ax.grid(True)

        handles, labels = ax.get_legend_handles_labels()
        wicket_legend1 = Line2D([0], [0], marker='o', color='w', label=f'{team1_name} Wicket',
                                markerfacecolor=team1_color, markeredgecolor='black', markersize=10)
        wicket_legend2 = Line2D([0], [0], marker='o', color='w', label=f'{team2_name} Wicket',
                                markerfacecolor=team2_color, markeredgecolor='black', markersize=10)
        handles.extend([wicket_legend1, wicket_legend2])
        ax.legend(handles=handles)

        plt.tight_layout()

        self.chart_placeholder.add_widget(FigureCanvasKivyAgg(fig))

        all_players_stats = self._calculate_all_player_stats(innings1_data, innings2_data)

        self._display_analysis_text(all_players_stats, team1_name, team2_name, innings1_data, innings2_data)

    def _calculate_all_player_stats(self, innings1_data, innings2_data):
        all_stats = {}

        for data in [innings1_data, innings2_data]:
            for name, stats in data['batsman_scores'].items():
                if name not in all_stats: all_stats[name] = {}
                all_stats[name]['batting'] = stats
            for name, stats in data['bowler_figures'].items():
                if name not in all_stats: all_stats[name] = {}
                all_stats[name]['bowling'] = stats

        player_metrics = {}
        for name, stats in all_stats.items():
            if 'Extra' in name: continue

            runs, balls_faced, sr = 0, 0, 0
            if 'batting' in stats and stats['batting']['B'] > 0:
                runs = stats['batting']['R']
                balls_faced = stats['batting']['B']
                sr = (runs / balls_faced) * 100

            wickets, balls_bowled, runs_conceded, er = 0, 0, 0, 0
            if 'bowling' in stats and stats['bowling']['B'] > 0:
                wickets = stats['bowling']['W']
                balls_bowled = stats['bowling']['B']
                runs_conceded = stats['bowling']['R']
                er = (runs_conceded / (balls_bowled / 6))

            player_metrics[name] = {'R': runs, 'SR': sr, 'W': wickets, 'ER': er, 'did_bat': balls_faced > 0,
                                    'did_bowl': balls_bowled > 0}

        max_r = max(p['R'] for p in player_metrics.values()) or 1
        max_sr = max(p['SR'] for p in player_metrics.values()) or 1
        max_w = max(p['W'] for p in player_metrics.values()) or 1
        bowlers_er = [p['ER'] for p in player_metrics.values() if p['did_bowl']]
        max_er = max(bowlers_er) if bowlers_er else 0
        min_er = min(bowlers_er) if bowlers_er else 0

        for name, metrics in player_metrics.items():
            norm_r = metrics['R'] / max_r
            norm_sr = metrics['SR'] / max_sr
            batting_score = (0.6 * norm_r) + (0.4 * norm_sr) if metrics['did_bat'] else 0

            norm_w = metrics['W'] / max_w
            norm_er = (max_er - metrics['ER']) / (max_er - min_er) if (metrics['did_bowl'] and max_er > min_er) else 0
            bowling_score = (0.7 * norm_w) + (0.3 * norm_er) if metrics['did_bowl'] else 0

            # Corrected overall score calculation
            overall_score = batting_score + bowling_score

            player_metrics[name]['overall_score'] = overall_score

        return player_metrics

    def _display_analysis_text(self, all_players_stats, team1_name, team2_name, innings1_data, innings2_data):
        team1_players = {p['name'] for p in innings1_data['team_data']}
        team2_players = {p['name'] for p in innings2_data['team_data']}

        team1_performers = sorted([p for p in all_players_stats.items() if p[0] in team1_players],
                                  key=lambda item: item[1]['overall_score'], reverse=True)
        team2_performers = sorted([p for p in all_players_stats.items() if p[0] in team2_players],
                                  key=lambda item: item[1]['overall_score'], reverse=True)

        man_of_the_match = sorted(all_players_stats.items(), key=lambda item: item[1]['overall_score'], reverse=True)[0]

        # Man of the Match section with better mobile spacing
        mom_header = Label(
            text="Man of the Match", 
            font_size='24sp', 
            bold=True, 
            size_hint_y=None, 
            height=60, 
            halign='center', 
            valign='middle',
            color=(1, 1, 1, 1)  # White text for consistency
        )
        mom_header.bind(size=mom_header.setter('text_size'))
        self.analysis_text_layout.add_widget(mom_header)
        
        self.analysis_text_layout.add_widget(
            self._create_player_stat_label(man_of_the_match, innings1_data, innings2_data))
        self.analysis_text_layout.add_widget(Widget(size_hint_y=None, height=40))

        # Team 1 section with better mobile spacing
        team1_header = Label(
            text=f"{team1_name} - Top Contributors", 
            font_size='22sp', 
            bold=True, 
            size_hint_y=None, 
            height=60, 
            halign='center', 
            valign='middle',
            color=(1, 1, 1, 1)  # White text for consistency
        )
        team1_header.bind(size=team1_header.setter('text_size'))
        self.analysis_text_layout.add_widget(team1_header)
        
        for player in team1_performers[:2]:
            self.analysis_text_layout.add_widget(self._create_player_stat_label(player, innings1_data, innings2_data))
        self.analysis_text_layout.add_widget(Widget(size_hint_y=None, height=40))

        # Team 2 section with better mobile spacing
        team2_header = Label(
            text=f"{team2_name} - Top Contributors", 
            font_size='22sp', 
            bold=True, 
            size_hint_y=None, 
            height=60, 
            halign='center', 
            valign='middle',
            color=(1, 1, 1, 1)  # White text for consistency
        )
        team2_header.bind(size=team2_header.setter('text_size'))
        self.analysis_text_layout.add_widget(team2_header)
        
        for player in team2_performers[:2]:
            self.analysis_text_layout.add_widget(self._create_player_stat_label(player, innings1_data, innings2_data))
        self.analysis_text_layout.add_widget(Widget(size_hint_y=None, height=40))

        # Add Match Turning Point Analysis
        self._add_match_turning_point_analysis(team1_name, team2_name, innings1_data, innings2_data)

    def _create_player_stat_label(self, player_data, innings1, innings2):
        name, stats = player_data
        bat_stats_str, bowl_stats_str = "", ""

        all_bat_scores = {**innings1['batsman_scores'], **innings2['batsman_scores']}
        all_bowl_figs = {**innings1['bowler_figures'], **innings2['bowler_figures']}

        # Build batting stats string
        if name in all_bat_scores:
            bat_stats = all_bat_scores[name]
            if bat_stats['B'] > 0 or 'not out' not in bat_stats['how_out']:
                bat_stats_str = f"Batting: {bat_stats['R']}({bat_stats['B']})"

        # Build bowling stats string
        if name in all_bowl_figs:
            bowl_stats = all_bowl_figs[name]
            if bowl_stats['B'] > 0:
                overs = f"{bowl_stats['B'] // 6}.{bowl_stats['B'] % 6}"
                bowl_stats_str = f"Bowling: {bowl_stats['W']}/{bowl_stats['R']} ({overs} ov)"

        # Create final display string - ensure at least one stat is shown
        if bat_stats_str or bowl_stats_str:
            final_str = f"[b]{name}[/b]\n{bat_stats_str}{' | ' if bat_stats_str and bowl_stats_str else ''}{bowl_stats_str}"
        else:
            # Fallback if no stats found - show the name at least
            final_str = f"[b]{name}[/b]\nNo performance data"

        label = Label(
            text=final_str, 
            markup=True, 
            font_size='18sp',  # Slightly smaller for better fit
            size_hint_y=None, 
            height=100,  # Increased height to prevent overlap
            halign='center', 
            valign='middle',
            text_size=(None, None),  # Allow text wrapping
            color=(1, 1, 1, 1)  # White text for consistency
        )
        # Bind text_size to widget width for proper text wrapping
        label.bind(size=lambda instance, size: setattr(instance, 'text_size', (size[0] - 20, None)))
        return label

    def _add_match_turning_point_analysis(self, team1_name, team2_name, innings1_data, innings2_data):
        """Add detailed match turning point analysis based on run rate changes"""
        
        # Turning point header with better mobile spacing
        turning_point_header = Label(
            text="Match Turning Point", 
            font_size='22sp', 
            bold=True, 
            size_hint_y=None, 
            height=60, 
            halign='center', 
            valign='middle',
            color=(1, 1, 1, 1)  # White text for consistency
        )
        turning_point_header.bind(size=turning_point_header.setter('text_size'))
        self.analysis_text_layout.add_widget(turning_point_header)
        
        # Add spacing after header to prevent overlap
        self.analysis_text_layout.add_widget(Widget(size_hint_y=None, height=20))
        
        # Get over scores and wickets info for both teams
        team1_over_scores = innings1_data.get('over_scores', [])
        team2_over_scores = innings2_data.get('over_scores', [])
        
        # Check for all-out scenarios
        team1_wickets = innings1_data.get('wickets', 0)
        team2_wickets = innings2_data.get('wickets', 0)
        team1_all_out = team1_wickets >= 10
        team2_all_out = team2_wickets >= 10
        
        # Calculate actual overs played (not just over_scores length)
        team1_overs_played = len(team1_over_scores)
        team2_overs_played = len(team2_over_scores)
        
        # Adjust for all-out scenarios
        if team1_all_out and team1_overs_played == 0:
            team1_overs_played = 1  # Minimum for rate calculation
        if team2_all_out and team2_overs_played == 0:
            team2_overs_played = 1  # Minimum for rate calculation
        
        # Helper to calculate runs and balls for a range of overs
        def get_runs_and_balls(over_scores, start_over, end_over):
            runs = 0
            balls = 0
            for i in range(start_over, min(end_over, len(over_scores))):
                over = over_scores[i]
                # over can be int (full over) or tuple/list (partial over: (runs, balls))
                if isinstance(over, (tuple, list)) and len(over) == 2:
                    runs += over[0]
                    balls += over[1]
                else:
                    runs += over
                    balls += 6
            return runs, balls

        # Divide match into 4 quadrants based on maximum overs planned
        max_overs = max(team1_overs_played, team2_overs_played, 1)
        quadrant_size = max(1, max_overs // 4)

        # Calculate RPO for each quadrant (runs per over, extrapolated for partial overs)
        def quadrant_rpo(over_scores, start_over, end_over):
            runs, balls = get_runs_and_balls(over_scores, start_over, end_over)
            if balls == 0:
                return 0.0
            rpo = (runs / balls) * 6
            return min(rpo, 36.0)  # Cap at 36 RPO

        team1_q1_rpo = quadrant_rpo(team1_over_scores, 0, quadrant_size)
        team1_q2_rpo = quadrant_rpo(team1_over_scores, quadrant_size, 2 * quadrant_size)
        team1_q3_rpo = quadrant_rpo(team1_over_scores, 2 * quadrant_size, 3 * quadrant_size)
        team1_q4_rpo = quadrant_rpo(team1_over_scores, 3 * quadrant_size, team1_overs_played)

        team2_q1_rpo = quadrant_rpo(team2_over_scores, 0, quadrant_size)
        team2_q2_rpo = quadrant_rpo(team2_over_scores, quadrant_size, 2 * quadrant_size)
        team2_q3_rpo = quadrant_rpo(team2_over_scores, 2 * quadrant_size, 3 * quadrant_size)
        team2_q4_rpo = quadrant_rpo(team2_over_scores, 3 * quadrant_size, team2_overs_played)

        # Find the quadrant with the biggest difference
        rpo_differences = [
            abs(team1_q1_rpo - team2_q1_rpo),
            abs(team1_q2_rpo - team2_q2_rpo),
            abs(team1_q3_rpo - team2_q3_rpo),
            abs(team1_q4_rpo - team2_q4_rpo)
        ]
        max_diff_quadrant = rpo_differences.index(max(rpo_differences)) if any(rpo_differences) else 0

        quadrant_names = ["first", "second", "third", "final"]
        quadrant_ranges = [
            f"1-{quadrant_size}",
            f"{quadrant_size + 1}-{2 * quadrant_size}",
            f"{2 * quadrant_size + 1}-{3 * quadrant_size}",
            f"{3 * quadrant_size + 1}-{max_overs}"
        ]

        team1_quadrant_rpos = [team1_q1_rpo, team1_q2_rpo, team1_q3_rpo, team1_q4_rpo]
        team2_quadrant_rpos = [team2_q1_rpo, team2_q2_rpo, team2_q3_rpo, team2_q4_rpo]

        better_team = team1_name if team1_quadrant_rpos[max_diff_quadrant] > team2_quadrant_rpos[max_diff_quadrant] else team2_name
        worse_team = team2_name if better_team == team1_name else team1_name

        better_rpo = max(team1_quadrant_rpos[max_diff_quadrant], team2_quadrant_rpos[max_diff_quadrant])
        worse_rpo = min(team1_quadrant_rpos[max_diff_quadrant], team2_quadrant_rpos[max_diff_quadrant])
        
        # Handle special cases for all-out scenarios
        team1_total = sum([over[0] if isinstance(over, (tuple, list)) else over for over in team1_over_scores]) if team1_over_scores else 0
        team2_total = sum([over[0] if isinstance(over, (tuple, list)) else over for over in team2_over_scores]) if team2_over_scores else 0

        # Create contextual analysis with all-out considerations
        if team1_all_out or team2_all_out:
            if team1_all_out and team2_all_out:
                analysis_text = f"Both teams collapsed! {team1_name} managed {team1_total} runs before being bowled out, while {team2_name} was dismissed for {team2_total} runs."
            elif team1_all_out:
                analysis_text = f"{team1_name} was bowled out for {team1_total} runs in {team1_overs_played} overs. {team2_name} successfully chased/defended the target."
            else:  # team2_all_out
                analysis_text = f"{team2_name} collapsed for {team2_total} runs while chasing {team1_total}. The bowling attack proved too strong."
        else:
            # Normal analysis for completed innings
            if max_diff_quadrant == 0:  # First quadrant
                analysis_text = f"The match was decided early! {better_team} dominated the opening {quadrant_ranges[0]} overs with {better_rpo:.1f} RPO, while {worse_team} managed only {worse_rpo:.1f} RPO."
            elif max_diff_quadrant == 1:  # Second quadrant
                analysis_text = f"The {quadrant_names[max_diff_quadrant]} phase (overs {quadrant_ranges[max_diff_quadrant]}) changed everything. {better_team} scored at {better_rpo:.1f} RPO while {worse_team} struggled at {worse_rpo:.1f} RPO."
            elif max_diff_quadrant == 2:  # Third quadrant
                analysis_text = f"The middle overs (overs {quadrant_ranges[max_diff_quadrant]}) became the turning point. {better_team} found their rhythm with {better_rpo:.1f} RPO compared to {worse_team}'s {worse_rpo:.1f} RPO."
            else:  # Final quadrant
                analysis_text = f"The death overs proved decisive. {better_team} finished strongly in overs {quadrant_ranges[max_diff_quadrant]} with {better_rpo:.1f} RPO vs {worse_team}'s {worse_rpo:.1f} RPO."
        
        # Create properly sized analysis label for mobile with text wrapping
        analysis_label = Label(
            text=analysis_text, 
            markup=True, 
            font_size='18sp', 
            size_hint_y=None,
            height=200,  # Increased height to prevent overlap
            halign='center',
            valign='top',
            text_size=(None, None),
            color=(1, 1, 1, 1)  # White text for consistency
        )
        # Ensure proper text wrapping by binding text_size to widget width
        analysis_label.bind(size=lambda instance, size: setattr(instance, 'text_size', (size[0] - 40, None)))
        
        self.analysis_text_layout.add_widget(analysis_label)
        self.analysis_text_layout.add_widget(Widget(size_hint_y=None, height=40))  # Bottom padding


# =============================================================================
# PLAYER ANALYTICS SCREEN CLASS
# =============================================================================
class PlayerAnalyticsScreen(BoxLayout):
    def __init__(self, player_manager=None, **kwargs):
        super().__init__(**kwargs)
        # Keep consistent with other tabs - no custom background
        
        self.orientation = 'vertical'
        self.spacing = 15
        self.padding = 15
        self.player_manager = player_manager
        self.selected_players = []  # For spider chart selection
        self.spider_chart_canvas = None  # For spider chart display
        self.current_sort_stat = 'runs'  # Default sort by runs
        self.current_sort_text = 'Sort by Runs'  # Track the current sort display text
        self.current_view = 'stats'  # Track current view mode
        
        # Header with search and sort controls
        self.create_header()
        
        # Two-tab layout: Combined Stats and Spider Chart
        self.create_tabs()
        
        # Load initial data
        self.refresh_stats()
    
    def create_header(self):
        header_layout = BoxLayout(size_hint_y=None, height=80, spacing=15)
        
        # Sort dropdown with all stats - using Button + DropDown for better control
        self.sort_dropdown = DropDown()
        sort_options = [
            'Sort by Runs', 'Sort by Average', 'Sort by Strike Rate', 
            'Sort by Wickets', 'Sort by Economy', 'Sort by Bowling Average',
            'Sort by Matches Played', 'Sort by Highest Score'
        ]
        
        for option in sort_options:
            btn = Button(text=option, size_hint_y=None, height='48dp', font_size='16sp')
            # Fix lambda closure issue by using default parameter
            btn.bind(on_release=lambda btn, option=option: self.on_sort_selection(option))
            self.sort_dropdown.add_widget(btn)
        
        self.sort_button = Button(
            text='Sort by Runs',
            size_hint=(1, 1),
            font_size='16sp'
        )
        self.sort_button.bind(on_release=self.sort_dropdown.open)
        
        header_layout.add_widget(self.sort_button)
        self.add_widget(header_layout)
        
        # Add spacing between header and tabs to prevent text cutoff
        spacer = Label(text='', size_hint_y=None, height=15)
        self.add_widget(spacer)
    
    def create_tabs(self):
        # Two-tab layout: Stats List and Spider Chart
        tab_layout = BoxLayout(
            size_hint_y=None, 
            height=70, 
            spacing=8,
            padding=[10, 10, 10, 10]  # Add padding to prevent overlap
        )
        
        self.stats_btn = ToggleButton(text='Player Stats', group='view_mode', state='down', font_size='16sp')
        self.spider_btn = ToggleButton(text='Spider Chart', group='view_mode', font_size='16sp')
        
        self.stats_btn.bind(on_press=self.on_view_change)
        self.spider_btn.bind(on_press=self.on_view_change)
        
        tab_layout.add_widget(self.stats_btn)
        tab_layout.add_widget(self.spider_btn)
        
        self.add_widget(tab_layout)
    
    def create_stats_display(self):
        # Scrollable stats area
        self.stats_scroll = ScrollView()
        self.stats_layout = BoxLayout(orientation='vertical', size_hint_y=None, spacing=5)
        self.stats_layout.bind(minimum_height=self.stats_layout.setter('height'))
        
        self.stats_scroll.add_widget(self.stats_layout)
        self.add_widget(self.stats_scroll)
    
    def on_sort_selection(self, text):
        """Handle sort option selection from dropdown"""
        # Extract stat name from dropdown text
        sort_mapping = {
            'Sort by Runs': 'runs',
            'Sort by Average': 'average',
            'Sort by Strike Rate': 'strike_rate',
            'Sort by Wickets': 'wickets',
            'Sort by Economy': 'economy',
            'Sort by Bowling Average': 'bowling_average',
            'Sort by Matches Played': 'matches',
            'Sort by Highest Score': 'highest_score'
        }
        self.current_sort_stat = sort_mapping.get(text, 'runs')
        self.current_sort_text = text  # Store the display text
        
        # Debug print to see if method is being called
        print(f"Sort selection changed to: {text}")
        print(f"Button text before: {self.sort_button.text}")
        
        # Close the dropdown first
        self.sort_dropdown.dismiss()
        
        # Use Clock.schedule_once to ensure the text update happens after the dropdown closes
        def update_button_text(dt):
            self.sort_button.text = self.current_sort_text
            print(f"Button text updated via Clock: {self.sort_button.text}")
        
        Clock.schedule_once(update_button_text, 0.1)
        
        # Refresh the stats display with new sorting
        self.refresh_stats()
    
    def on_view_change(self, instance):
        if instance.state == 'down':
            self.refresh_stats()
    
    def refresh_stats(self):
        """Load and display player statistics"""
        # Store current view mode before clearing widgets
        if hasattr(self, 'spider_btn'):
            self.current_view = 'spider' if self.spider_btn.state == 'down' else 'stats'
        
        # Clear existing content
        self.clear_widgets()
        self.create_header()
        self.create_tabs()
        
        # Restore view mode after recreating tabs
        if self.current_view == 'spider':
            self.spider_btn.state = 'down'
            self.stats_btn.state = 'normal'
            self.display_spider_chart()
        else:
            self.spider_btn.state = 'normal'
            self.stats_btn.state = 'down'
            self.display_player_list()
    
    def display_player_list(self):
        """Display sortable list of players with summary stat"""
        # Create stats display area
        self.create_stats_display()
        
        # Load and process data
        stats_data = self.load_combined_stats_data()
        
        # Sort data
        stats_data = self.sort_stats_data(stats_data)
        
        if not stats_data:
            # Show no data message
            no_data_label = Label(
                text='[color=888888][i]No player statistics available yet. Import data or start recording matches to see detailed analytics.[/i][/color]',
                markup=True,
                font_size='18sp',
                halign='center',
                valign='middle',
                color=(1, 1, 1, 1)
            )
            no_data_label.bind(size=no_data_label.setter('text_size'))
            self.stats_layout.add_widget(no_data_label)
            return
        
        # Add header showing current sort
        header_text = self.get_sort_header_text()
        header_label = Label(
            text=f'[b]{header_text}[/b]',
            markup=True,
            font_size='20sp',
            size_hint_y=None,
            height=50,
            halign='center',
            color=(1, 1, 1, 1)
        )
        header_label.bind(size=header_label.setter('text_size'))
        self.stats_layout.add_widget(header_label)
        
        # Add player rows
        for player_data in stats_data:
            player_row = self.create_player_row(player_data)
            self.stats_layout.add_widget(player_row)
    
    def get_sort_header_text(self):
        """Get header text based on current sort"""
        headers = {
            'runs': 'Players by Total Runs',
            'average': 'Players by Batting Average',
            'strike_rate': 'Players by Strike Rate',
            'wickets': 'Players by Wickets Taken',
            'economy': 'Players by Bowling Economy',
            'bowling_average': 'Players by Bowling Average',
            'matches': 'Players by Matches Played',
            'highest_score': 'Players by Highest Score'
        }
        return headers.get(self.current_sort_stat, 'Player Statistics')
    
    def create_player_row(self, player_data):
        """Create a clickable row for each player showing name and sort stat"""
        row_layout = BoxLayout(
            size_hint_y=None, 
            height=60, 
            spacing=10,
            padding=[10, 5]
        )
        
        # Player name as clickable button (70% width)
        name_button = Button(
            text=f'[b]{player_data["name"]}[/b]',
            markup=True,
            font_size='18sp',
            size_hint_x=0.7,
            halign='left',
            valign='middle',
            color=(1, 1, 1, 1),
            background_color=(0.3, 0.3, 0.3, 0.8),  # Subtle background for button
            border=(0, 0, 0, 0)  # No border
        )
        name_button.bind(size=name_button.setter('text_size'))
        name_button.bind(on_press=lambda x, pd=player_data: self.show_player_details(pd))
        
        # Current sort stat value (30% width)
        stat_value = self.get_display_stat_value(player_data)
        stat_label = Label(
            text=f'[b]{stat_value}[/b]',
            markup=True,
            font_size='18sp',
            size_hint_x=0.3,
            halign='center',
            valign='middle',
            color=(1, 1, 1, 1)
        )
        stat_label.bind(size=stat_label.setter('text_size'))
        
        row_layout.add_widget(name_button)
        row_layout.add_widget(stat_label)
        
        return row_layout
    
    def get_display_stat_value(self, player_data):
        """Get formatted display value for current sort stat"""
        stat_formatters = {
            'runs': lambda x: f"{int(x.get('runs', 0))} runs",
            'average': lambda x: f"{x.get('average', 0):.1f} avg",
            'strike_rate': lambda x: f"{x.get('strike_rate', 0):.1f} SR",
            'wickets': lambda x: f"{int(x.get('wickets', 0))} wkts",
            'economy': lambda x: f"{x.get('economy', 0):.1f} econ",
            'bowling_average': lambda x: f"{x.get('bowling_average', 0):.1f} avg",
            'matches': lambda x: f"{int(x.get('matches', 0))} matches",
            'highest_score': lambda x: f"{int(x.get('highest_score', 0))} HS"
        }
        
        formatter = stat_formatters.get(self.current_sort_stat, lambda x: "N/A")
        return formatter(player_data)
    
    def show_player_details(self, player_data):
        """Show detailed popup with all player statistics"""
        # Create detailed stats content with better spacing
        details_layout = BoxLayout(orientation='vertical', spacing=15, padding=[20, 20])
        
        # Player name header
        name_header = Label(
            text=f'[size=36][b]{player_data["name"]}[/b][/size]',
            markup=True,
            size_hint_y=None,
            height=70,
            halign='center',
            valign='top',
            color=(1, 1, 1, 1)
        )
        name_header.bind(size=name_header.setter('text_size'))
        details_layout.add_widget(name_header)
        
        # Batting stats section
        if player_data.get('runs', 0) > 0 or player_data.get('innings', 0) > 0:
            batting_header = Label(
                text='[size=32][b]Batting Statistics[/b][/size]',
                markup=True,
                size_hint_y=None,
                height=60,
                halign='center',
                valign='top',
                color=(1, 1, 1, 1)
            )
            batting_header.bind(size=batting_header.setter('text_size'))
            details_layout.add_widget(batting_header)
            
            batting_stats = f"""Matches: {int(player_data.get('matches', 0))}
Innings: {int(player_data.get('innings', 0))}
Runs: {int(player_data.get('runs', 0))}
Balls Faced: {int(player_data.get('balls_faced', 0))}
Highest Score: {int(player_data.get('highest_score', 0))}
Not Outs: {int(player_data.get('not_outs', 0))}
Average: {player_data.get('average', 0):.2f}
Strike Rate: {player_data.get('strike_rate', 0):.0f}
Boundaries: {int(player_data.get('fours', 0))} fours, {int(player_data.get('sixes', 0))} sixes
Milestones: {int(player_data.get('fifties', 0))} fifties, {int(player_data.get('hundreds', 0))} hundreds
Total Boundaries: {int(player_data.get('fours', 0)) + int(player_data.get('sixes', 0))}"""
            
            batting_label = Label(
                text=batting_stats,
                font_size='20sp',  # Increased font size
                size_hint_y=None,
                height=280,  # Increased height for additional line
                halign='left',
                valign='top',
                color=(1, 1, 1, 1),
                text_size=(None, None)
            )
            batting_label.bind(size=batting_label.setter('text_size'))
            details_layout.add_widget(batting_label)
        
        # Bowling stats section
        if player_data.get('wickets', 0) > 0 or player_data.get('balls_bowled', 0) > 0:
            bowling_header = Label(
                text='[size=32][b]Bowling Statistics[/b][/size]',
                markup=True,
                size_hint_y=None,
                height=60,
                halign='center',
                valign='top',
                color=(1, 1, 1, 1)
            )
            bowling_header.bind(size=bowling_header.setter('text_size'))
            details_layout.add_widget(bowling_header)
            
            overs_bowled = f"{player_data.get('balls_bowled', 0) // 6}.{player_data.get('balls_bowled', 0) % 6}"
            bowling_stats = f"""Bowling Matches: {int(player_data.get('bowling_matches', 0))}
Bowling Innings: {int(player_data.get('bowling_innings', 0))}
Overs Bowled: {overs_bowled}
Balls Bowled: {int(player_data.get('balls_bowled', 0))}
Runs Conceded: {int(player_data.get('runs_conceded', 0))}
Wickets: {int(player_data.get('wickets', 0))}
Best Figures: {player_data.get('best_figures', 'N/A')}
Bowling Average: {player_data.get('bowling_average', 0):.2f}
Economy Rate: {player_data.get('economy', 0):.2f}
Bowling Strike Rate: {player_data.get('bowling_sr', 0):.2f}"""
            
            bowling_label = Label(
                text=bowling_stats,
                font_size='20sp',  # Increased font size
                size_hint_y=None,
                height=280,  # Increased height for additional lines
                halign='left',
                valign='top',
                color=(1, 1, 1, 1),
                text_size=(None, None)
            )
            bowling_label.bind(size=bowling_label.setter('text_size'))
            details_layout.add_widget(bowling_label)
        
        # Create popup with scrollable content
        scroll_view = ScrollView()
        scroll_view.add_widget(details_layout)
        
        popup = Popup(
            title=f'{player_data["name"]} - Detailed Statistics',
            content=scroll_view,
            size_hint=(0.95, 0.9),  # Made popup larger
            title_size='22sp'  # Increased title size
        )
        popup.open()
    
    def load_combined_stats_data(self):
        """Load player statistics from individual CSV files"""
        stats_data = []
        
        try:
            from android_safe_data_manager import AndroidSafeDataManager
            data_manager = AndroidSafeDataManager()
            
            players_data = {}
            batting_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("batting"))
            bowling_file = os.path.join(data_manager.data_dir, data_manager._get_csv_filename("bowling"))
            
            # Load batting stats from CSV
            if os.path.exists(batting_file):
                import csv
                with open(batting_file, 'r', newline='') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        player_name = row['Player']
                        players_data[player_name] = {
                            'name': player_name,
                            'matches': int(row.get('Matches', 0)),
                            'innings': int(row.get('Innings', 0)),
                            'runs': int(row.get('Runs', 0)),
                            'balls_faced': int(row.get('Balls_Faced', 0)),
                            'not_outs': int(row.get('Not_Outs', 0)),
                            'highest_score': int(row.get('Highest_Score', 0)),
                            'fours': int(row.get('4s', 0)),
                            'sixes': int(row.get('6s', 0)),
                            'fifties': int(row.get('50s', 0)),
                            'hundreds': int(row.get('100s', 0)),
                            'average': float(row.get('Average', 0.0)),
                            'strike_rate': float(row.get('Strike_Rate', 0.0))
                        }
            
            # Load bowling stats from CSV
            if os.path.exists(bowling_file):
                import csv
                with open(bowling_file, 'r', newline='') as file:
                    reader = csv.DictReader(file)
                    for row in reader:
                        player_name = row['Player']
                        if player_name not in players_data:
                            players_data[player_name] = {
                                'name': player_name,
                                'matches': 0, 'innings': 0, 'runs': 0,
                                'balls_faced': 0, 'not_outs': 0, 'highest_score': 0,
                                'fours': 0, 'sixes': 0, 'fifties': 0, 'hundreds': 0,
                                'average': 0.0, 'strike_rate': 0.0
                            }
                        
                        # Add bowling data
                        players_data[player_name]['bowling_matches'] = int(row.get('Matches', 0))
                        players_data[player_name]['bowling_innings'] = int(row.get('Innings', 0))
                        players_data[player_name]['balls_bowled'] = int(row.get('Balls', 0))
                        players_data[player_name]['runs_conceded'] = int(row.get('Runs', 0))
                        players_data[player_name]['wickets'] = int(row.get('Wickets', 0))
                        players_data[player_name]['bowling_average'] = float(row.get('Average', 0.0))
                        players_data[player_name]['economy_rate'] = float(row.get('Economy', 0.0))
                        players_data[player_name]['bowling_sr'] = float(row.get('Strike_Rate', 0.0))
            
            # Map economy_rate to economy for compatibility with sorting/display logic
            for player_data in players_data.values():
                player_data['economy'] = player_data.get('economy_rate', 0.0)
            
            stats_data = list(players_data.values())
            
        except Exception as e:
            print(f"Error loading stats: {e}")
            stats_data = []
        
        return stats_data
    
    def sort_stats_data(self, stats_data):
        """Sort statistics data based on current sort selection"""
        sort_key_map = {
            'runs': lambda x: x.get('runs', 0),
            'average': lambda x: x.get('average', 0),
            'strike_rate': lambda x: x.get('strike_rate', 0),
            'wickets': lambda x: x.get('wickets', 0),
            'economy': lambda x: x.get('economy', 999),
            'bowling_average': lambda x: x.get('bowling_average', 999),
            'matches': lambda x: x.get('matches', 0),
            'highest_score': lambda x: x.get('highest_score', 0)
        }
        
        sort_key = sort_key_map.get(self.current_sort_stat, lambda x: x.get('runs', 0))
        reverse_sort = self.current_sort_stat not in ['economy', 'bowling_average']  # Lower is better for economy and bowling average
        
        return sorted(stats_data, key=sort_key, reverse=reverse_sort)
    
    def display_spider_chart(self):
        """Display spider chart for player comparison"""
        # Create stats display area
        self.create_stats_display()
        
        # Load stats data
        stats_data = self.load_combined_stats_data()
        
        if not stats_data:
            no_data_label = Label(
                text='[color=888888][i]No player statistics available for spider chart. Import data or start recording matches.[/i][/color]',
                markup=True,
                font_size='18sp',
                halign='center',
                valign='middle',
                color=(1, 1, 1, 1)
            )
            no_data_label.bind(size=no_data_label.setter('text_size'))
            self.stats_layout.add_widget(no_data_label)
            return
        
        # Filter players with some stats
        filtered_stats = [p for p in stats_data if (p.get('runs', 0) > 0 or p.get('wickets', 0) > 0)]
        
        if not filtered_stats:
            no_stats_label = Label(
                text='[color=888888][i]No player performance data available yet for comparison.[/i][/color]',
                markup=True,
                font_size='18sp',
                halign='center',
                valign='middle',
                color=(1, 1, 1, 1)
            )
            no_stats_label.bind(size=no_stats_label.setter('text_size'))
            self.stats_layout.add_widget(no_stats_label)
            return
        
        # Instructions
        instructions = Label(
            text='[b]Select 2 players to compare on spider chart[/b]',
            markup=True,
            font_size='18sp',
            size_hint_y=None,
            height=50,
            halign='center',
            color=(1, 1, 1, 1)
        )
        instructions.bind(size=instructions.setter('text_size'))
        self.stats_layout.add_widget(instructions)
        
        # Player selection dropdowns - side by side
        self.selected_players = [None, None]  # For two players
        dropdown_layout = BoxLayout(orientation='horizontal', spacing=20, size_hint_y=None, height=60, padding=[20, 10])
        
        # Colors matching the chart lines (RGBA format)
        colors = [[1.0, 0.42, 0.42, 0.3], [0.31, 0.80, 0.77, 0.3]]  # Semi-transparent red and teal matching chart
        
        # Create player names list for dropdowns
        player_names = ['None'] + [player['name'] for player in filtered_stats[:10]]
        
        # Player 1 dropdown (Red)
        self.player1_dropdown = Spinner(
            text='Select Player 1',
            values=player_names,
            size_hint=(0.45, 1),
            font_size='16sp',
            background_color=colors[0]  # Semi-transparent red background
        )
        self.player1_dropdown.bind(text=lambda instance, text: self.on_player_selection(0, text, filtered_stats))
        
        # Player 2 dropdown (Teal)  
        self.player2_dropdown = Spinner(
            text='Select Player 2',
            values=player_names,
            size_hint=(0.45, 1),
            font_size='16sp',
            background_color=colors[1]  # Semi-transparent teal background
        )
        self.player2_dropdown.bind(text=lambda instance, text: self.on_player_selection(1, text, filtered_stats))
        
        dropdown_layout.add_widget(self.player1_dropdown)
        dropdown_layout.add_widget(self.player2_dropdown)
        self.stats_layout.add_widget(dropdown_layout)
        
        # Chart area - much larger square dimensions for bigger spider chart
        self.chart_widget = Widget(size_hint_y=None, height=1200)
        # Bind widget size to update chart positioning and maintain square aspect
        self.chart_widget.bind(size=self._update_chart_canvas, pos=self._update_chart_canvas)
        self.stats_layout.add_widget(self.chart_widget)
    
    def on_player_selection(self, player_index, player_name, filtered_stats):
        """Handle player selection from dropdown"""
        if player_name == 'None':
            self.selected_players[player_index] = None
        else:
            # Find the player data by name
            for player in filtered_stats:
                if player['name'] == player_name:
                    self.selected_players[player_index] = player
                    break
        
        # Update spider chart if both players are selected or if clearing
        self.update_spider_chart()
    
    def _update_chart_canvas(self, instance, value):
        """Update chart canvas when widget size/position changes"""
        if hasattr(self, 'selected_players') and any(p is not None for p in self.selected_players):
            Clock.schedule_once(lambda dt: self.update_spider_chart(), 0.1)
    
    def update_spider_chart(self):
        """Update the spider chart with selected players"""
        # Filter out None players
        active_players = [p for p in self.selected_players if p is not None]
        
        if not active_players:
            # Clear chart if no players selected
            self.chart_widget.canvas.clear()
            return
        
        try:
            import matplotlib.pyplot as plt
            import numpy as np
            from matplotlib.backends.backend_agg import FigureCanvasAgg
            from kivy.graphics.texture import Texture
            from kivy.graphics import Rectangle, Color
            
            # Clear existing chart
            self.chart_widget.canvas.clear()
            
            # Create clean spider chart similar to test version
            fig = plt.figure(figsize=(10, 10))
            ax = fig.add_subplot(111, projection='polar')
            
            # Define metrics for spider chart
            metrics = [
                'Batting Avg', 'Strike Rate', 'Highest Score', 'Bat Consistency',
                'Bowl Economy', 'Bowl Strike Rate', 'Bowl Consistency', 'Best Figures'
            ]
            
            # Calculate angles for 8 metrics (equally spaced around circle)
            angles = np.linspace(0, 2 * np.pi, len(metrics), endpoint=False).tolist()
            angles += angles[:1]  # Complete the circle
            
            # Colors for different players - match dropdown colors
            colors = ['#ff6b6b', '#4ecdc4']  # Red and Teal to match dropdowns
            
            # Plot each player
            for i, player in enumerate(active_players):
                if i >= 2:  # Limit to 2 players
                    break
                    
                # Normalize player stats (0-1 scale)
                values = self.normalize_player_stats(player)
                values += values[:1]  # Complete the circle
                
                # Plot the spider chart for this player
                ax.plot(angles, values, 'o-', linewidth=2, label=player['name'], color=colors[i])
                ax.fill(angles, values, alpha=0.25, color=colors[i])
            
            # Set chart limits and styling
            ax.set_ylim(0, 1)
            
            # Add metric labels
            ax.set_xticks(angles[:-1])
            ax.set_xticklabels(metrics)
            
            # Add legend only if multiple players
            if len(active_players) > 1:
                ax.legend(loc='upper right', bbox_to_anchor=(1.1, 1.1))
            
            # Use tight layout for clean appearance
            plt.tight_layout()
            
            # Convert to texture and display
            canvas = FigureCanvasAgg(fig)
            canvas.draw()
            
            # Get buffer and convert to proper format
            buf = canvas.buffer_rgba()
            import numpy as np
            buf_array = np.frombuffer(buf, dtype=np.uint8)
            
            w, h = canvas.get_width_height()
            
            # Create texture that maintains aspect ratio
            texture = Texture.create(size=(w, h), colorfmt='rgba')
            texture.blit_buffer(buf_array, colorfmt='rgba', bufferfmt='ubyte')
            texture.flip_vertical()
            
            # Scale to fit widget while maintaining aspect ratio
            widget_aspect = self.chart_widget.width / self.chart_widget.height
            chart_aspect = w / h
            
            if chart_aspect > widget_aspect:
                # Chart is wider, fit to width
                chart_width = self.chart_widget.width
                chart_height = chart_width / chart_aspect
            else:
                # Chart is taller, fit to height  
                chart_height = self.chart_widget.height
                chart_width = chart_height * chart_aspect
            
            # Center the chart in the widget
            x_pos = self.chart_widget.x + (self.chart_widget.width - chart_width) / 2
            y_pos = self.chart_widget.y + (self.chart_widget.height - chart_height) / 2
            
            with self.chart_widget.canvas:
                Color(1, 1, 1, 1)  # Set color to white before drawing
                Rectangle(texture=texture, size=(chart_width, chart_height), pos=(x_pos, y_pos))
            
            plt.close(fig)
            
        except Exception as e:
            print(f"Error creating spider chart: {e}")
    
    def normalize_player_stats(self, player):
        """Normalize player stats to 0-1 scale for spider chart with new 8 metrics"""
        # Get all players for normalization context
        all_stats = self.load_combined_stats_data()
        
        if not all_stats:
            return [0.5] * 8  # Default values for 8 metrics
        
        # Calculate batting metrics maximums
        max_avg = max(p.get('average', 0) for p in all_stats) or 1
        max_sr = max(p.get('strike_rate', 0) for p in all_stats) or 1
        max_high_score = max(p.get('highest_score', 0) for p in all_stats) or 1
        
        # Calculate batting consistency (based on coefficient of variation of runs per innings)
        batting_consistencies = []
        for p in all_stats:
            innings = p.get('innings', 0)
            if innings > 0:
                avg_runs = p.get('average', 0)
                # Use highest score as proxy for variability - lower ratio = more consistent
                if avg_runs > 0:
                    consistency_ratio = min(avg_runs / max(p.get('highest_score', 1), 1), 1.0)
                    batting_consistencies.append(consistency_ratio)
        max_batting_consistency = max(batting_consistencies) if batting_consistencies else 1
        
        # Calculate bowling metrics
        economies = [p.get('economy', 0) for p in all_stats if p.get('economy', 0) > 0]
        min_economy = min(economies) if economies else 0
        max_economy = max(economies) if economies else 1
        
        # Bowling strike rate (from bowling_sr field) - lower is better
        bowl_strike_rates = [p.get('bowling_sr', 0) for p in all_stats if p.get('bowling_sr', 0) > 0]
        min_bowl_sr = min(bowl_strike_rates) if bowl_strike_rates else 0
        max_bowl_sr = max(bowl_strike_rates) if bowl_strike_rates else 1
        
        # Bowling consistency (based on economy rate vs bowling average ratio)
        bowling_consistencies = []
        for p in all_stats:
            economy = p.get('economy', 0)
            bowl_avg = p.get('bowling_average', 0)
            if economy > 0 and bowl_avg > 0:
                # Lower economy relative to bowling average = more consistent
                consistency = bowl_avg / economy  # Higher ratio = more consistent
                bowling_consistencies.append(consistency)
        max_bowling_consistency = max(bowling_consistencies) if bowling_consistencies else 1
        
        # Best bowling figures - use wickets taken as proxy
        max_wickets = max(p.get('wickets', 0) for p in all_stats) or 1
        
        # Current player stats
        player_innings = player.get('innings', 0)
        player_batting_consistency = 0
        if player_innings > 0 and player.get('average', 0) > 0:
            player_batting_consistency = min(player.get('average', 0) / max(player.get('highest_score', 1), 1), 1.0)
        
        player_bowling_consistency = 0
        if player.get('economy', 0) > 0 and player.get('bowling_average', 0) > 0:
            player_bowling_consistency = player.get('bowling_average', 0) / player.get('economy', 1)
        
        # Normalize player stats (8 metrics) - ensure all values are between 0 and 1
        normalized = []
        
        # Batting metrics (0-3)
        normalized.append(min(player.get('average', 0) / max_avg, 1.0))  # Batting Average
        normalized.append(min(player.get('strike_rate', 0) / max_sr, 1.0))  # Strike Rate  
        normalized.append(min(player.get('highest_score', 0) / max_high_score, 1.0))  # Highest Score
        normalized.append(min(player_batting_consistency / max_batting_consistency, 1.0) if max_batting_consistency > 0 else 0)  # Batting Consistency
        
        # Bowling metrics (4-7)
        # Economy: lower is better, so invert (good economy = high score on chart)
        if max_economy > min_economy and player.get('economy', 0) > 0:
            economy_norm = (player.get('economy', 0) - min_economy) / (max_economy - min_economy)
            normalized.append(max(1 - economy_norm, 0.0))  # Invert and clamp
        else:
            normalized.append(0.5)  # Default for players without bowling data
            
        # Bowling Strike Rate: lower is better, so invert  
        if max_bowl_sr > min_bowl_sr and player.get('bowling_sr', 0) > 0:
            bowl_sr_norm = (player.get('bowling_sr', 0) - min_bowl_sr) / (max_bowl_sr - min_bowl_sr)
            normalized.append(max(1 - bowl_sr_norm, 0.0))  # Invert and clamp
        else:
            normalized.append(0.5)  # Default for players without bowling data
            
        # Bowling Consistency: higher ratio is better
        normalized.append(min(player_bowling_consistency / max_bowling_consistency, 1.0) if max_bowling_consistency > 0 else 0)
        
        # Best Bowling Figures (using total wickets as proxy)
        normalized.append(min(player.get('wickets', 0) / max_wickets, 1.0))
        
        return normalized


# =============================================================================
# UTILITY FUNCTIONS  
# =============================================================================

def create_wrapping_label(text, **kwargs):
    """Create a label that wraps text properly for mobile"""
    label = Label(
        text=text,
        text_size=(None, None),
        halign='center',
        valign='middle',
        **kwargs
    )
    label.bind(size=label.setter('text_size'))
    return label
