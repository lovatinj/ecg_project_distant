import React from 'react';
import { Grid, Button } from '@material-ui/core';
// import TimePicker from 'react-time-picker';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import { format, parse } from 'date-fns';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import moment from "moment"

import 'react-time-picker/dist/TimePicker.css';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateField } from '@mui/x-date-pickers/DateField';

import History from "../components/chart_history"

const drawerWidth = 240;

const styles = theme => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  drawerOpen: {
      width: drawerWidth,
      transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
      }),
  },
  drawerClose: {
      transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
      }),
      overflowX: 'hidden',
      width: theme.spacing(7) + 1,
      [theme.breakpoints.up('sm')]: {
          width: theme.spacing(9) + 1,
      },
  },
  drawerContainer: {
      overflow: 'auto',
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 200,
  },
})

class Historique extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      startTime: "",
      endTime: "",
      openDialog: true,
      dataHistory: [],
      hide: true
    }
  }

  componentDidMount = () => {
    this.props.socket.on("post:historique", data => {
      this.setState({dataHistory: data})
    })
  }

  handleStartDateChange = (value) => {
    this.setState({startTime: value})
  }

  handleEndDateChange = (value) => {
    this.setState({endTime: value})
  }

  // handleSearch = () => {
  //   // Utilisez startDate et endDate comme nécessaire
  //   console.log('Dates sélectionnées :', this.state.startTme, this.state.endTime);
  // };

  handleOpenDialog = () => {
    this.setState({openDialog: true})
  }

  handleCloseDialog = () => {
    this.setState({openDialog: false})
  }

  handleSendDialog = () => {
    this.setState({
      openDialog: false,
      hide: false
    })

    const startDate = new Date(this.state.startTime["$d"])
    const endDate = new Date(this.state.endTime["$d"])

    const formattedDateStart = moment(startDate).format('DD-MM-YYYY');
    const formattedDateEnd = moment(endDate).format('DD-MM-YYYY');

    this.props.socket.emit("get:data", [formattedDateStart, formattedDateEnd])
  }


  render(){
    const { classes, socket } = this.props;
    const tomorrow = dayjs().add(1, 'day');

    return(
      <div>
        <Dialog open={this.state.openDialog} onClose={this.handleCloseDialog} aria-labelledby="choose-time-picker" maxWidth="lg">
        <DialogTitle id="choose-time-picker">Choisir l'intervalle de votre historique</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Choissisez vos heures de début et de fin
            </DialogContentText>
            <Grid container spacing={2} alignItems="center">
            <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateField onChange={(value) => this.handleStartDateChange(value)} disableFuture />
            </LocalizationProvider>
            </Grid>
            <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateField onChange={(value) => this.handleEndDateChange(value)} disableFuture />
            </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
            <Button onClick={this.handleCloseDialog} color="primary">
                Fermer
            </Button>
            <Button onClick={this.handleSendDialog} color="primary">
                Rechercher
            </Button>
        </DialogActions>
        </Dialog>
        
        {!this.state.hide ?
          <History socket={socket}/>
        : null}

      <Fab className="fab-historique-button" onClick={this.handleOpenDialog} color="primary" aria-label="add">
        <AddIcon />
      </Fab>

      </div>
    )
  }
}

export default withStyles(styles)(Historique);